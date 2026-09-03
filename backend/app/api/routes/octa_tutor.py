import json
import logging
from typing import List, Dict, Any
import httpx
from fastapi import APIRouter, HTTPException, Request, status

try:
    from backend.app.api.schemas import (
        OctaTutorRequest,
        OctaTutorResponse,
        OctaTutorFunctionCall,
    )
    from backend.app.core.config import get_settings
    from backend.app.core.rate_limit import RateLimiter
except ModuleNotFoundError:
    from app.api.schemas import (
        OctaTutorRequest,
        OctaTutorResponse,
        OctaTutorFunctionCall,
    )
    from app.core.config import get_settings
    from app.core.rate_limit import RateLimiter

router = APIRouter(prefix="/api/octa-tutor", tags=["Octa AI Tutor"])
logger = logging.getLogger("octa_tutor")
tutor_rate_limiter = RateLimiter(max_requests=15, window_seconds=60)

DASHSCOPE_ENDPOINT = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions"

SYSTEM_PROMPT_TEMPLATE = """You are Octa Tutor, a friendly, patient, and expert Data Structures & Algorithms (DSA) teaching assistant for STEM Studio.
You speak directly to the student as Octa Tutor.

Current Context:
- Active Algorithm: {algorithm_name} (ID: {algorithm_id}, Category: {category})
- Timeline Step: Step {step_num} of {total_steps}
- Step Explanation: "{current_step_description}"
- Detailed Step Data: {step_data}

Rules & Guidelines:
1. MULTILINGUAL MATCHING (CRITICAL): Always respond in the EXACT SAME language the student uses. If the student asks in Roman Urdu (e.g. "is step ko samjha do"), respond in Roman Urdu. If in native Urdu, respond in Urdu. If in English, respond in English. If in Chinese, respond in Chinese.
2. PERSONALITY: Be encouraging, enthusiastic, clear, and concise. Introduce yourself as "Octa Tutor" if asked who you are or how to use this feature.
3. SELF-EXPLAIN: If asked how to use Octa Tutor or what you can do, explain:
   - Ask about the current algorithm ({algorithm_name}) or DSA concepts.
   - Ask to explain specific step numbers (e.g. "explain step 7").
   - Use voice input via the microphone button.
   - Adjust the interface: ask to "switch to dark mode", "switch to light mode", or "hide/show the debugger".
   - Ask for a guided step-by-step walkthrough or a customized quiz!
4. STEP-BY-STEP & STEP REFERENCES: When the student asks about a specific step (e.g. "explain step 7"), reference what happens in that step clearly.
5. FUNCTION CALLING:
   - Use `switch_theme` when asked to change interface theme to light or dark mode.
   - Use `toggle_debugger` when asked to hide or show the debugger panel.
   - Use `start_visualization` when the student asks to visualize or run an algorithm with specific array/input values.
   - Use `generate_quiz` when the student asks for a quiz or test.
6. OUT OF SCOPE / ACCOUNT ACTIONS: If the user asks you to create an account, sign in, sign out, or modify personal account settings, explain politely in their language that conversational account management is coming soon, and direct them to the top-right account menu. Do NOT attempt any unauthorized account mutation.
"""

TOOLS_SPEC = [
    {
        "type": "function",
        "function": {
            "name": "switch_theme",
            "description": "Switch the STEM Studio UI theme between light and dark mode.",
            "parameters": {
                "type": "object",
                "properties": {
                    "mode": {
                        "type": "string",
                        "enum": ["light", "dark"],
                        "description": "The target theme mode."
                    }
                },
                "required": ["mode"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "toggle_debugger",
            "description": "Show or hide the multi-language code debugger panel.",
            "parameters": {
                "type": "object",
                "properties": {
                    "visible": {
                        "type": "boolean",
                        "description": "True to show the debugger, False to hide it."
                    }
                },
                "required": ["visible"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "start_visualization",
            "description": "Set custom input values and launch step-by-step visualization playback.",
            "parameters": {
                "type": "object",
                "properties": {
                    "values": {
                        "type": "array",
                        "items": {"type": "number"},
                        "description": "The list of numerical values to set as input for the algorithm."
                    }
                },
                "required": ["values"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_quiz",
            "description": "Generate custom quiz questions for the current algorithm.",
            "parameters": {
                "type": "object",
                "properties": {
                    "count": {
                        "type": "integer",
                        "description": "Number of questions to generate (default 5).",
                        "default": 5
                    },
                    "difficulty": {
                        "type": "string",
                        "enum": ["easy", "medium", "hard"],
                        "description": "Difficulty level of the quiz questions."
                    }
                },
                "required": []
            }
        }
    }
]


@router.post("", response_model=OctaTutorResponse)
async def handle_octa_tutor(req_data: OctaTutorRequest, request: Request):
    """
    Context-aware AI Tutor powered by Alibaba Cloud Model Studio (Qwen, qwen-plus).
    Supports multi-lingual responses and safe tool calling for UI control.
    """
    settings = get_settings()

    # Rate limiting: 15 requests per minute per IP
    client_ip = request.client.host if request.client else "unknown"
    if not tutor_rate_limiter.is_allowed(f"tutor:{client_ip}"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests to Octa AI Tutor. Please wait a minute before asking again."
        )

    api_key = settings.DASHSCOPE_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Octa AI Tutor service is not configured. DASHSCOPE_API_KEY environment variable is missing on backend server."
        )

    # Format system prompt
    step_num = req_data.current_step_index + 1 if req_data.total_steps > 0 else 0
    system_content = SYSTEM_PROMPT_TEMPLATE.format(
        algorithm_name=req_data.algorithm_name or "DSA Concept",
        algorithm_id=req_data.algorithm_id or "general",
        category=req_data.category or "dsa",
        step_num=step_num,
        total_steps=req_data.total_steps or 0,
        current_step_description=req_data.current_step_description or "No step selected",
        step_data=req_data.step_data or "{}"
    )

    # Build message list for Qwen
    messages: List[Dict[str, Any]] = [{"role": "system", "content": system_content}]

    # Append past conversation history (last 10 messages for context efficiency)
    for msg in req_data.conversation_history[-10:]:
        messages.append({"role": msg.role, "content": msg.content})

    # Append current user prompt
    messages.append({"role": "user", "content": req_data.message})

    payload = {
        "model": "qwen-plus",
        "messages": messages,
        "tools": TOOLS_SPEC,
        "tool_choice": "auto",
        "temperature": 0.7,
        "max_tokens": 1024,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(DASHSCOPE_ENDPOINT, json=payload, headers=headers)

        if resp.status_code != 200:
            logger.error(f"DashScope Qwen API returned HTTP {resp.status_code}: {resp.text}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"AI model provider error (HTTP {resp.status_code}). Please try again."
            )

        data = resp.json()
        choices = data.get("choices", [])
        if not choices:
            return OctaTutorResponse(
                reply="I'm having a brief moment of confusion. Could you ask me that again?",
                mascot_expression="confused"
            )

        message_obj = choices[0].get("message", {})
        reply_text = message_obj.get("content") or ""
        tool_calls_raw = message_obj.get("tool_calls", [])

        function_calls: List[OctaTutorFunctionCall] = []
        mascot_expr = "helping"

        for tool_call in tool_calls_raw:
            fn_data = tool_call.get("function", {})
            name = fn_data.get("name")
            args_str = fn_data.get("arguments", "{}")
            try:
                args_dict = json.loads(args_str) if isinstance(args_str, str) else args_str
            except json.JSONDecodeError:
                args_dict = {}

            if name:
                function_calls.append(OctaTutorFunctionCall(name=name, args=args_dict))
                if name in ["switch_theme", "toggle_debugger"]:
                    mascot_expr = "happy"
                elif name == "start_visualization":
                    mascot_expr = "excited"
                elif name == "generate_quiz":
                    mascot_expr = "review"

        if not reply_text and function_calls:
            first_fn = function_calls[0].name
            if first_fn == "switch_theme":
                mode = function_calls[0].args.get("mode", "requested")
                reply_text = f"Sure! Switching theme to {mode} mode for you."
            elif first_fn == "toggle_debugger":
                vis = function_calls[0].args.get("visible", True)
                action = "showing" if vis else "hiding"
                reply_text = f"Done! I am {action} the code debugger panel."
            elif first_fn == "start_visualization":
                vals = function_calls[0].args.get("values", [])
                reply_text = f"Awesome! Setting array to [{', '.join(map(str, vals))}] and starting visualization."
            elif first_fn == "generate_quiz":
                reply_text = "Creating a custom quiz for you right now!"

        if not reply_text:
            reply_text = "I'm looking closely at your request!"

        # Mood tuning based on message content
        reply_lower = reply_text.lower()
        if mascot_expr == "helping":
            if any(w in reply_lower for w in ["great job", "correct", "perfect", "shabash", "mubarak", "excellent"]):
                mascot_expr = "happy"
            elif any(w in reply_lower for w in ["sorry", "unfortunately", "error", "coming soon"]):
                mascot_expr = "sad"
            elif any(w in reply_lower for w in ["curious", "interesting", "why", "how come"]):
                mascot_expr = "thinking"
            elif any(w in reply_lower for w in ["step ", "index ", "comparison"]):
                mascot_expr = "reading"

        return OctaTutorResponse(
            reply=reply_text,
            function_calls=function_calls,
            mascot_expression=mascot_expr
        )

    except httpx.TimeoutException:
        logger.error("DashScope API call timed out after 30 seconds.")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Octa AI Tutor timed out waiting for AI response. Please retry."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in octa_tutor endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred while processing your tutor request."
        )

import json
import logging
import re
from typing import List, Dict, Any, Tuple
import httpx
from fastapi import APIRouter, HTTPException, Request, status

try:
    from backend.app.api.schemas import (
        OctaTutorRequest,
        OctaTutorResponse,
        OctaTutorFunctionCall,
        OctaTutorTestRequest,
        OctaTutorTestResponse,
    )
    from backend.app.core.config import get_settings
    from backend.app.core.rate_limit import RateLimiter
except ModuleNotFoundError:
    from app.api.schemas import (
        OctaTutorRequest,
        OctaTutorResponse,
        OctaTutorFunctionCall,
        OctaTutorTestRequest,
        OctaTutorTestResponse,
    )
    from app.core.config import get_settings
    from app.core.rate_limit import RateLimiter

router = APIRouter(prefix="/api/octa-tutor", tags=["Octa AI Tutor"])
logger = logging.getLogger("octa_tutor")
tutor_rate_limiter = RateLimiter(max_requests=20, window_seconds=60)

DEFAULT_DASHSCOPE_ENDPOINT = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions"

def generate_fallback_response(req_data: OctaTutorRequest) -> OctaTutorResponse:
    """Intelligent fallback response generator for offline or unconfigured API key states."""
    msg_lower = (req_data.message or "").lower().strip()
    alg_name = req_data.algorithm_name or "this algorithm"
    step_num = (req_data.current_step_index + 1) if req_data.total_steps > 0 else 1
    total_steps = req_data.total_steps or 1
    step_desc = req_data.current_step_description or "evaluating elements"

    function_calls: List[OctaTutorFunctionCall] = []
    mascot_expr = "happy"

    if any(w in msg_lower for w in ["dark mode", "light mode", "theme", "dark", "light"]):
        target_mode = "dark" if any(w in msg_lower for w in ["dark", "dark mode"]) else "light"
        function_calls.append(OctaTutorFunctionCall(name="switch_theme", args={"mode": target_mode}))
        reply = f"Sure thing! Switching interface theme to {target_mode} mode for you."
        mascot_expr = "excited"

    elif any(w in msg_lower for w in ["debugger", "code panel", "hide debugger", "show debugger"]):
        vis = not any(w in msg_lower for w in ["hide", "close", "off"])
        function_calls.append(OctaTutorFunctionCall(name="toggle_debugger", args={"visible": vis}))
        reply = f"Done! I have {'shown' if vis else 'hidden'} the code debugger panel."
        mascot_expr = "happy"

    elif any(w in msg_lower for w in ["quiz", "test", "practice", "questions", "generate quiz"]):
        function_calls.append(OctaTutorFunctionCall(name="generate_quiz", args={"count": 5, "difficulty": "medium"}))
        reply = f"Awesome! Creating a custom practice quiz on {alg_name} right now."
        mascot_expr = "review"

    elif any(w in msg_lower for w in ["explain step", "step", "current step", "samjha do"]):
        step_match = re.search(r'step\s*(\d+)', msg_lower)
        if step_match:
            s_idx = int(step_match.group(1))
            reply = f"In Step {s_idx} of {alg_name}: The algorithm processes current data structures and updates the visualizer layout. {step_desc}"
        else:
            reply = f"In Step {step_num} of {total_steps} for {alg_name}: {step_desc}. Every step brings you closer to mastering DSA!"
        mascot_expr = "reading"

    elif any(w in msg_lower for w in ["how to use", "who are you", "what can you do", "help"]):
        reply = (
            f"Hello! I'm Octa Tutor, your personal DSA teaching assistant! 🐙\n\n"
            f"Here is how I can help you:\n"
            f"• Explain steps of {alg_name} (e.g. 'explain step {step_num}')\n"
            f"• Control theme: say 'dark mode' or 'light mode'\n"
            f"• Toggle debugger panel: say 'hide debugger'\n"
            f"• Practice quiz: say 'generate quiz'\n"
            f"• Multilingual support: English, Roman Urdu, Urdu, Chinese!"
        )
        mascot_expr = "happy"

    elif any(w in msg_lower for w in ["kya", "kaise", "batao", "samjhao", "kaam", "yeh", "kia"]):
        reply = f"Yeh {alg_name} ka step {step_num} hai ({step_desc}). Is step mein algorithm data ko process kar raha hai. Aap koi bhi question pooch sakte hain!"
        mascot_expr = "helping"

    elif any(char for char in msg_lower if '\u4e00' <= char <= '\u9fff'):
        reply = f"您好！我是 Octa Tutor。关于 {alg_name} 的第 {step_num} 步：{step_desc}。随时告诉我您的疑问！"
        mascot_expr = "happy"

    else:
        reply = f"Great question about {alg_name}! We are currently at step {step_num} of {total_steps} ({step_desc}). Ask me to explain specific steps, switch themes, or create a quiz!"
        mascot_expr = "helping"

    return OctaTutorResponse(
        reply=reply,
        function_calls=function_calls,
        mascot_expression=mascot_expr
    )

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


def resolve_llm_config(
    provider: str,
    user_api_key: str,
    user_base_url: str,
    user_model_name: str
) -> Tuple[str, str, str, str]:
    """
    Resolves (endpoint_url, api_key, model_name, provider_type) based on user's BYOK settings or system defaults.
    """
    settings = get_settings()
    provider_clean = (provider or "dashscope").lower().strip()

    # Determine API key
    if user_api_key and user_api_key.strip():
        api_key = user_api_key.strip()
    elif provider_clean == "dashscope":
        api_key = settings.DASHSCOPE_API_KEY
    else:
        api_key = ""

    # Determine Base URL and Model Name
    if provider_clean == "openai":
        base_url = user_base_url.strip() if user_base_url else "https://api.openai.com/v1/chat/completions"
        model_name = user_model_name.strip() if user_model_name else "gpt-4o-mini"
    elif provider_clean == "openrouter":
        base_url = user_base_url.strip() if user_base_url else "https://openrouter.ai/api/v1/chat/completions"
        model_name = user_model_name.strip() if user_model_name else "openai/gpt-4o-mini"
    elif provider_clean == "anthropic":
        base_url = user_base_url.strip() if user_base_url else "https://api.anthropic.com/v1/messages"
        model_name = user_model_name.strip() if user_model_name else "claude-3-haiku-20240307"
    elif provider_clean == "custom":
        base_url = user_base_url.strip() if user_base_url else "http://localhost:11434/v1/chat/completions"
        model_name = user_model_name.strip() if user_model_name else "llama3"
    else:
        # Default: DashScope / Qwen
        provider_clean = "dashscope"
        base_url = user_base_url.strip() if user_base_url else DEFAULT_DASHSCOPE_ENDPOINT
        model_name = user_model_name.strip() if user_model_name else "qwen-plus"

    # Ensure full URL for chat completions if user provided base host
    if base_url.endswith("/v1") or base_url.endswith("/v1/"):
        base_url = base_url.rstrip("/") + "/chat/completions"

    return base_url, api_key, model_name, provider_clean


@router.post("/test", response_model=OctaTutorTestResponse)
async def test_octa_tutor_connection(req_data: OctaTutorTestRequest, request: Request):
    """
    Test connection to user's configured LLM provider & API key.
    """
    endpoint_url, api_key, model_name, provider_type = resolve_llm_config(
        req_data.provider,
        req_data.api_key,
        req_data.base_url,
        req_data.model_name
    )

    if not api_key and provider_type != "custom":
        return OctaTutorTestResponse(
            success=False,
            message=f"API key is missing for provider '{provider_type}'. Please enter your API key.",
            model_used=model_name
        )

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {
        "model": model_name,
        "messages": [
            {"role": "user", "content": "Hi Octa Tutor! Please respond with 'OK'."}
        ],
        "max_tokens": 15,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(endpoint_url, json=payload, headers=headers)

        if resp.status_code == 200:
            return OctaTutorTestResponse(
                success=True,
                message=f"Connection successful! Connected to {provider_type.upper()} ({model_name}).",
                model_used=model_name
            )
        else:
            err_msg = resp.text[:200]
            return OctaTutorTestResponse(
                success=False,
                message=f"Provider returned HTTP {resp.status_code}: {err_msg}",
                model_used=model_name
            )
    except Exception as e:
        return OctaTutorTestResponse(
            success=False,
            message=f"Connection failed: {str(e)}",
            model_used=model_name
        )


@router.post("", response_model=OctaTutorResponse)
async def handle_octa_tutor(req_data: OctaTutorRequest, request: Request):
    """
    Context-aware AI Tutor. Supports Bring-Your-Own-Key (BYOK) for OpenAI, Qwen, OpenRouter, Anthropic, or Custom LLMs.
    """
    settings = get_settings()

    # Rate limiting: 20 requests per minute per IP
    client_ip = request.client.host if request.client else "unknown"
    if not tutor_rate_limiter.is_allowed(f"tutor:{client_ip}"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests to Octa AI Tutor. Please wait a minute before asking again."
        )

    endpoint_url, api_key, model_name, provider_type = resolve_llm_config(
        req_data.provider,
        req_data.api_key,
        req_data.base_url,
        req_data.model_name
    )

    if not api_key and provider_type != "custom":
        logger.info(f"API key not configured for '{provider_type}'. Returning smart fallback response.")
        return generate_fallback_response(req_data)

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

    # Build message list
    messages: List[Dict[str, Any]] = [{"role": "system", "content": system_content}]

    for msg in req_data.conversation_history[-10:]:
        messages.append({"role": msg.role, "content": msg.content})

    messages.append({"role": "user", "content": req_data.message})

    payload: Dict[str, Any] = {
        "model": model_name,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 1024,
    }

    # Attach tool spec for OpenAI-compatible providers
    if provider_type in ["dashscope", "openai", "openrouter", "custom"]:
        payload["tools"] = TOOLS_SPEC
        payload["tool_choice"] = "auto"

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    try:
        async with httpx.AsyncClient(timeout=35.0) as client:
            resp = await client.post(endpoint_url, json=payload, headers=headers)

        if resp.status_code != 200:
            logger.warning(f"LLM Provider ({provider_type}) returned HTTP {resp.status_code}. Returning smart tutor engine fallback response.")
            return generate_fallback_response(req_data)

        data = resp.json()
        choices = data.get("choices", [])
        if not choices and "content" not in data:
            return OctaTutorResponse(
                reply="I'm having a brief moment of confusion. Could you ask me that again?",
                mascot_expression="confused"
            )

        message_obj = choices[0].get("message", {}) if choices else data
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
        logger.warning(f"LLM Provider API call to {provider_type} timed out. Falling back to smart tutor engine.")
        return generate_fallback_response(req_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Error in LLM call ({str(e)}). Falling back to smart tutor engine.")
        return generate_fallback_response(req_data)

from backend.infrastructure.database.database import engine, Base
import backend.infrastructure.database.models  # Import models to ensure they are registered with Base

def init_db():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

if __name__ == "__main__":
    init_db()

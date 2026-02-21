from fastapi.middleware.cors import CORSMiddleware
from queue_logic import recommend_best_counter
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import engine, SessionLocal
import models

models.Base.metadata.create_all(bind=engine)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def root():
    return {"message": "Smart Queue Backend Running"}

@app.post("/locations")
def create_location(name: str, db: Session = Depends(get_db)):
    new_location = models.Location(name=name)
    db.add(new_location)
    db.commit()
    db.refresh(new_location)
    return new_location
@app.post("/counters")
def create_counter(name: str, location_id: int, db: Session = Depends(get_db)):
    new_counter = models.Counter(
        name=name,
        location_id=location_id
    )
    db.add(new_counter)
    db.commit()
    db.refresh(new_counter)
    return new_counter
@app.post("/tokens")
def create_token(counter_id: int, db: Session = Depends(get_db)):
    new_token = models.Token(counter_id=counter_id)
    db.add(new_token)
    db.commit()
    db.refresh(new_token)
    return new_token
@app.get("/recommend/{location_id}")
def recommend_queue(location_id: int, db: Session = Depends(get_db)):
    counters = db.query(models.Counter).filter(
        models.Counter.location_id == location_id
    ).all()

    if not counters:
        return {"message": "No counters found for this location"}

    best_counter, estimated_wait = recommend_best_counter(counters, db)

    return {
        "recommended_counter": best_counter.name,
        "estimated_wait_minutes": estimated_wait
    }
@app.get("/counters/{location_id}")
def get_counters(location_id: int, db: Session = Depends(get_db)):
    counters = db.query(models.Counter).filter(
        models.Counter.location_id == location_id
    ).all()
    return counters
@app.get("/tokens/{counter_id}")
def get_tokens(counter_id: int, db: Session = Depends(get_db)):
    tokens = db.query(models.Token).filter(
        models.Token.counter_id == counter_id
    ).all()
    return tokens
from fastapi import FastAPI

app = FastAPI()

@app.get("/hello")
def read_hello():
    return {"message": "world"}
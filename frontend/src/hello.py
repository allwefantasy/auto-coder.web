def greet(name: str) -> str:
    return f"Hello, {name}!"
def greet(name):
    return f"Hello, {name}!"

if __name__ == "__main__":
    print(greet("World"))
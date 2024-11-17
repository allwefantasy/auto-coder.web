def greet(name: str) -> str:
    """
    Greet the user with a friendly message.

    Args:
        name (str): The name of the user.

    Returns:
        str: A greeting message.
    """
    return f"Hello, {name}! Welcome to auto-coder.web."

def main():
    """
    Main function to demonstrate the greet function.
    """
    user_name = input("Please enter your name: ")
    print(greet(user_name))

if __name__ == "__main__":
    main()
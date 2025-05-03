from app import create_app

app = create_app()

if __name__ == "__main__":
    # Using Flask's built-in server
    # Note: In production, consider using a proper WSGI server when deployed
    print("Starting server on http://localhost:8080")
    app.run(host='0.0.0.0', port=8080, threaded=True) 
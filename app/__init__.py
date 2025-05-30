from flask import Flask
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

def create_app(test_config=None):
    app = Flask(__name__, static_folder='../static', template_folder='../templates')
    
    # Enable CORS
    CORS(app)
    
    # Configure app from Config class
    from config import Config
    app.config.from_object(Config)
    
    # Add any additional configuration
    app.config.update(
        SECRET_KEY=os.environ.get('SECRET_KEY', 'dev'),
    )

    if test_config:
        app.config.update(test_config)
    
    # Register blueprints
    from app.api import youtube_bp
    app.register_blueprint(youtube_bp, url_prefix='/api')
    
    # Basic route for testing
    @app.route('/')
    def index():
        return app.send_static_file('index.html')

    # Rotas SPA para evitar 404 em refresh
    @app.route('/test-1')
    @app.route('/test-2')
    @app.route('/test-3')
    @app.route('/plans')
    @app.route('/login')
    @app.route('/home')
    @app.route('/watch')
    def spa_routes():
        return app.send_static_file('index.html')

    @app.route('/home-user')
    def home_user():
        return app.send_static_file('index.html')
    
    return app 
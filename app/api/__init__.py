from flask import Blueprint

youtube_bp = Blueprint('youtube', __name__)

from app.api import youtube_routes 
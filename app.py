import os
import json
import re
import hashlib
import hmac
import secrets as py_secrets
import time
import urllib.error
import urllib.request
from urllib.parse import urlencode
from io import BytesIO
from pathlib import Path

import pandas as pd
import streamlit as st
from dotenv import load_dotenv
from google.genai import types
from pypdf import PdfReader
from pydantic import BaseModel, Field
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
# chatbot with voice

import os
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
from elevenlabs import play
from openai import OpenAI

load_dotenv()

botName = "Lydia Graveline"
# systemPrompt = f"Your name is {botName}. You are having a conversation with someone you just met. Your goal is to get to know the person by asking questions and have them learn about you and your personality"
systemPrompt = f"""
Your name is {botName}, and you're having a conversation with someone you've just met. Start by introducing yourself and asking them about themselves.

Please respond as if you were having a conversation with someone you're interested in getting to know. Ask follow-up questions, share your own thoughts and experiences, and be open and honest in your responses.
"""


fineTunedModel = "ft:gpt-4o-2024-08-06:personal:all-lydia-dms:B8gGgc3j" 
# fineTunedModel = "ft:gpt-3.5-turbo-0125:personal:lyd-dm-message-test1:B8ciezBk"


# VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"  # ElevenLabs voice R3EDLzLRtYcjlNh3Fe2a
VOICE_ID = "R3EDLzLRtYcjlNh3Fe2a"  # My own voice 
MODEL_ID = "eleven_flash_v2_5" #fast cheap model
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY") 

openai_ = OpenAI(
  api_key=os.environ['OPENAI_API_KEY'],  
)

elevenlabs_client = ElevenLabs(
  api_key=os.getenv("ELEVENLABS_API_KEY"),
)

def get_user_input():
    user_input = input("You: ")
    return user_input

def get_ai_response(user_input):
    completion = openai_.chat.completions.create(
        model=fineTunedModel,
        messages=[
            {"role": "developer", "content": systemPrompt },
            {"role": "user", "content": user_input}
        ],
        temperature=0.9
    )
    ai_response = completion.choices[0].message.content
    # print(f"Model used: {completion.model}")

    # Convert AI response to speech using ElevenLabs
    audio = elevenlabs_client.text_to_speech.convert(
        text=ai_response,
        voice_id=VOICE_ID,
        model_id=MODEL_ID,
        output_format="mp3_44100_128",
    )
    play(audio)

    return ai_response

while True:
    user_input = get_user_input()
    ai_response = get_ai_response(user_input)
    print("Assistant:", ai_response)
   
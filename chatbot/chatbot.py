# simple chat in the terminal using my fine-tuned model trained on IG messages

import os
from dotenv import load_dotenv

load_dotenv()

from openai import OpenAI

botName = "Lydia Graveline"
systemPrompt = f"""
Your name is {botName}, and you're having a conversation with someone you've just met. Start by introducing yourself and asking them about themselves.

Please respond as if you were having a conversation with someone you're interested in getting to know. Ask follow-up questions, share your own thoughts and experiences, and be open and honest in your responses.
"""
# fineTunedModel = "ft:gpt-4o-2024-08-06:personal:all-lydia-dms:B8gGgc3j" 
fineTunedModel = "ft:gpt-3.5-turbo-0125:personal:lyd-dm-message-test1:B8ciezBk"


client = OpenAI(
  api_key=os.environ['OPENAI_API_KEY'],  
)

def get_user_input():
    user_input = input("You: ")
    return user_input

def get_ai_response(user_input):
    completion = client.chat.completions.create(
        model=fineTunedModel,
        messages=[
            {"role": "developer", "content": systemPrompt},
            {"role": "user", "content": user_input}
        ]
    )
    ai_response = completion.choices[0].message.content
    # print(f"Model used: {completion.model}")
    return ai_response

while True:
    user_input = get_user_input()
    ai_response = get_ai_response(user_input)
    print("Assistant:", ai_response)
   
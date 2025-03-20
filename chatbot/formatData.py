# to do
# 1. get the data from the json file
# 2. remove "sent an attachment" and special characters
# bottom up format, 
# 3. format the data for fine-tuning
# 4. save the data to a new json file
import os
import json
import re
import emoji
import unidecode

YOUR_NAME = "Lydia Graveline"
SYSTEM_PROMPT = f"Your name is {YOUR_NAME} and you speak in a conversational tone."

# Separate your responses and context
conversations = []
temp_messages = []

unwanted_content = ["You sent an attachment.", "You started an audio call"]
# ["Audio call ended", "You started an audio call", "Liked a message"]
# ["You sent an attachment.", "Audio call ended", "You started an audio call", "Liked a message"]

# folder path containing the JSON files
folder_path = "/Users/lydia/Desktop/WINTER2025/Poor-Romeo/lydiasDM/your_instagram_activity/messages/inbox/"

# Instagram Data
# Walk through the directory tree 
for root, dirs, files in os.walk(folder_path):
    for file in files:
        if file.endswith(".json"):
            file_path = os.path.join(root, file)
            with open(file_path, "r") as file:
                data = json.load(file)
                # Access the "messages" key
                messages = data["messages"]
                prev_message = None
               
                # Iterate over each message
                for msg in reversed(messages):
                    sender = msg.get("sender_name", "") #(or use an empty string if it's missing)
                    content = msg.get("content", "").strip()

                    # Remove link URLS from the data
                    content = re.sub(r'http\S+', '', content)                    
                    
                    # Skip empty messages
                    if not content or content in unwanted_content:
                        continue

                    if sender == YOUR_NAME:
                        if prev_message is not None and prev_message["sender"] != YOUR_NAME:
                            conversation = {
                                 "messages": [
                                     
                                    # uncomment to include user and system prompt data
                                    # {"role": "system", "content": SYSTEM_PROMPT},
                                    {"role": "user", "content": prev_message["content"]},
                                     
                                    {"role": "assistant", "content": content}
                                ]
                            }                               

                            conversations.append(conversation)
                        prev_message = None
                    else:
                        prev_message = {"sender": sender, "content": content}

# Add Hinge data to conversations
hinge_file_path = "/Users/lydia/Desktop/WINTER2025/Poor-Romeo/Clean_data/Lydia_hinge_data.json"
with open(hinge_file_path, "r") as hinge_file:
    hinge_data = json.load(hinge_file)
    hinge_messages = hinge_data["messages"]

    for message in hinge_messages:
        content = message["message"]
        conversation = {
            "messages": [
                # {"role": "system", "content": SYSTEM_PROMPT},
                # {"role": "assistant", "content": "hinge: " + content}
                {"role": "assistant", "content": content}
            ]

        }
        conversations.append(conversation)


# Save formatted fine-tuning data
with open("formatted_finetuning_data.jsonl", "w",) as outfile:
    for convo in conversations:
        json.dump(convo, outfile)
        outfile.write("\n")
        



print(f"Processed {len(conversations)} conversations for fine-tuning.")
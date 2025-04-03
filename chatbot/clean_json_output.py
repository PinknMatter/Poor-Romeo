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

# Separate responses and context
conversations = []

unwanted_content = ["You sent an attachment.", "You started an audio call"]

# Function to fix Unicode issues
def fix_unicode_issues(text):
    try:
        return text.encode('latin1').decode('utf-8')
    except (UnicodeEncodeError, UnicodeDecodeError):
        return text  # Return original if decoding fails

# Folder path containing the JSON files
folder_path = "C:/Users/noahk/OneDrive/Desktop/School/4-2/Poor Romeo/Poor-Romeo/Noah_Data/DM/your_instagram_activity/messages/inbox/"

# Process Instagram Data
for root, dirs, files in os.walk(folder_path):
    for file in files:
        if file.endswith(".json"):
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8") as file:
                data = json.load(file)
                messages = data["messages"]
                prev_message = None
                
                for msg in reversed(messages):
                    sender = msg.get("sender_name", "")
                    content = msg.get("content", "").strip()
                    content = re.sub(r'http\S+', '', content)  # Remove URLs
                    content = fix_unicode_issues(content)  # Fix Unicode issues
                    
                    if not content or content in unwanted_content:
                        continue
                    
                    if sender == YOUR_NAME:
                        if prev_message and prev_message["sender"] != YOUR_NAME:
                            conversation = {
                                "messages": [
                                    {"role": "user", "content": prev_message["content"]},
                                    {"role": "assistant", "content": content}
                                ]
                            }
                            conversations.append(conversation)
                        prev_message = None
                    else:
                        prev_message = {"sender": sender, "content": content}

# Add Hinge data to conversations
hinge_file_path = "C:/Users/noahk/OneDrive/Desktop/School/4-2/Poor Romeo/Poor-Romeo/Noah_Data/Fine-Tuning/matches.json"
with open(hinge_file_path, "r", encoding="utf-8") as hinge_file:
    hinge_data = json.load(hinge_file)
    hinge_messages = hinge_data["messages"]

    for message in hinge_messages:
        content = fix_unicode_issues(message["message"])  # Fix Unicode issues
        conversation = {
            "messages": [
                {"role": "assistant", "content": content}
            ]
        }
        conversations.append(conversation)

# Save formatted fine-tuning data
with open("formatted_finetuning_data.jsonl", "w", encoding="utf-8") as outfile:
    for convo in conversations:
        json.dump(convo, outfile, ensure_ascii=False)  # Ensure proper Unicode encoding
        outfile.write("\n")

print(f"Processed {len(conversations)} conversations for fine-tuning.")
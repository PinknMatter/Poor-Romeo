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

# unwanted_content = ["You sent an attachment.", "You started an audio call", "Audio call ended", "Liked a message", "❤️","Reacted ❤️ to your message"]

unwanted_content_patterns = [ 
    r".* sent an attachment\.",
    r".* liked a message",
    "Liked a message",
    r".* started an audio call",
    "You started an audio call", 
    "Audio call ended", 
    r".* reacted .* to your message",
    r"Reacted .* to your message",
    r".*named the group .*.",
    "You sent an attachment.",
    r"^❤️$",
    # r"^[^a-zA-Z]*$"
]


# unwanted_keywords = ["attachment", "liked", "audio call"]


# Function to fix Unicode issues
def fix_unicode_issues(text):
    try:
        return text.encode('latin1').decode('utf-8')
    except (UnicodeEncodeError, UnicodeDecodeError):
        return text  # Return original if decoding fails

# Folder path containing the JSON files
folder_path = "/Users/lydia/Desktop/WINTER2025/Poor-Romeo/lydiasDM/your_instagram_activity/messages/inbox/"

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
                    
                    # if not content or content in unwanted_content:
                    #     continue

                    if not content or any(re.search(pattern, content, re.IGNORECASE) for pattern in unwanted_content_patterns):
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
hinge_file_path = "/Users/lydia/Desktop/WINTER2025/Poor-Romeo/Clean_data/Lydia_hinge_data.json"
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


# # to do
# # 1. get the data from the json file
# # 2. remove "sent an attachment" and special characters
# # bottom up format, 
# # 3. format the data for fine-tuning
# # 4. save the data to a new json file
# import os
# import json
# import re
# import emoji
# import unidecode

# YOUR_NAME = "N O A H"
# SYSTEM_PROMPT = f"Your name is {YOUR_NAME} and you speak in a conversational tone."

# # Separate responses and context
# conversations = []

# unwanted_content = ["You sent an attachment.", "You started an audio call"]

# # Function to fix Unicode issues
# def fix_unicode_issues(text):
#     try:
#         return text.encode('latin1').decode('utf-8')
#     except (UnicodeEncodeError, UnicodeDecodeError):
#         return text  # Return original if decoding fails

# # Folder path containing the JSON files
# folder_path = r"\Users\noahk\Downloads\instagram-noahkornb-2025-02-22-w7GLslw1\your_instagram_activity\messages\inbox"

# # Check if the folder exists
# if not os.path.exists(folder_path):
#     print(f"Warning: Instagram folder path does not exist: {folder_path}")
# else:
#     print(f"Processing Instagram data from: {folder_path}")

# # Process Instagram Data
# for root, dirs, files in os.walk(folder_path):
#     for file in files:
#         if file.endswith(".json"):
#             file_path = os.path.join(root, file)
#             with open(file_path, "r", encoding="utf-8") as file:
#                 data = json.load(file)
#                 messages = data["messages"]
                
#                 # Group messages by conversation
#                 current_conversation = []
                
#                 # Process messages in chronological order (oldest to newest)
#                 for msg in reversed(messages):
#                     sender = msg.get("sender_name", "")
#                     content = msg.get("content", "").strip()
                    
#                     # Skip if no content or unwanted content
#                     if not content or content in unwanted_content:
#                         continue
                    
#                     # Remove URLs and fix Unicode issues
#                     content = re.sub(r'http\S+', '', content)
#                     content = fix_unicode_issues(content)
                    
#                     # Add message to current conversation
#                     current_conversation.append({
#                         "sender": sender,
#                         "content": content
#                     })
                
#                 # Process the conversation to create user-assistant pairs
#                 i = 0
#                 while i < len(current_conversation) - 1:
#                     # Look for pairs where one message is from YOU and one is from someone else
#                     if (current_conversation[i]["sender"] != YOUR_NAME and 
#                         current_conversation[i+1]["sender"] == YOUR_NAME):
#                         # Create a conversation with user (other person) and assistant (YOU) roles
#                         conversation = {
#                             "messages": [
#                                 {"role": "user", "content": current_conversation[i]["content"]},
#                                 {"role": "assistant", "content": current_conversation[i+1]["content"]}
#                             ]
#                         }
#                         conversations.append(conversation)
#                         i += 2  # Skip both messages
#                     else:
#                         i += 1  # Move to next message

# # Add Hinge data to conversations
# hinge_file_path = r"C:\Users\noahk\OneDrive\Desktop\School\4-2\Poor Romeo\Poor-Romeo\Clean_data\Noah_hinge_data.json"

# # Check if the Hinge data file exists
# if not os.path.exists(hinge_file_path):
#     print(f"Warning: Hinge data file does not exist: {hinge_file_path}")
# else:
#     print(f"Processing Hinge data from: {hinge_file_path}")
#     with open(hinge_file_path, "r", encoding="utf-8") as hinge_file:
#         hinge_data = json.load(hinge_file)
#         hinge_messages = hinge_data["messages"]

#         for message in hinge_messages:
#             content = fix_unicode_issues(message["message"])  # Fix Unicode issues
#             conversation = {
#                 "messages": [
#                     {"role": "assistant", "content": content}
#                 ]
#             }
#             conversations.append(conversation)

# # Save formatted fine-tuning data
# with open("formatted_finetuning_data.jsonl", "w", encoding="utf-8") as outfile:
#     for convo in conversations:
#         json.dump(convo, outfile, ensure_ascii=False)  # Ensure proper Unicode encoding
#         outfile.write("\n")

# print(f"Processed {len(conversations)} conversations for fine-tuning.")


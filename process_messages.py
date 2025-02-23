import json
import os

def load_json_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as file:
        return json.load(file)

def get_user_name(user_data):
    # Extract the first name from user data
    return user_data.get('first_name', '')

def process_data():
    try:
        # Get the current directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Define input and output paths
        matches_file = os.path.join(current_dir, 'Data', 'Noah', 'hinge',  'matches.json')
        user_file = os.path.join(current_dir, 'Data', 'Noah', 'hinge',  'user.json')
        prompts_file = os.path.join(current_dir, 'Data', 'Noah', 'hinge', 'prompts.json')
        
        # Create clean_data directory path
        output_dir = os.path.join(current_dir, 'Data', 'Clean_data')
        
        print(f"Processing data from Hinge files...")
        
        # Load all required files
        matches_data = load_json_file(matches_file)
        user_data = load_json_file(user_file)
        prompts_data = load_json_file(prompts_file)
        
        # Get user's name
        user_name = get_user_name(user_data)
        
        # Extract messages
        messages = []
        for match in matches_data:
            if 'chats' in match:
                for chat in match.get('chats', []):
                    if chat.get('body'):
                        # Clean and format the message
                        message = {
                            'message': chat['body'].strip(),
                            'timestamp': chat.get('timestamp', '')
                        }
                        # Only add non-empty messages
                        if message['message']:
                            messages.append(message)
        
        # Extract prompts text
        prompts = []
        for prompt in prompts_data:
            if prompt.get('text'):
                prompts.append({
                    'prompt_question': prompt.get('prompt', ''),
                    'text': prompt.get('text', ''),
                    'created': prompt.get('created', '')
                })
        
        # Create output data
        output_data = {
            'user_name': user_name,
            'messages': messages,
            'prompts': prompts
        }
        
        # Create output filename with user's name
        output_file = os.path.join(output_dir, f'{user_name.lower()}_hinge_data.json')
        
        # Write the processed data to the output file
        with open(output_file, 'w', encoding='utf-8') as file:
            json.dump(output_data, file, indent=2, ensure_ascii=False)
        
        print(f"Successfully processed data and saved to {output_file}")
        print(f"Processed {len(messages)} messages and {len(prompts)} prompts")

    except FileNotFoundError as e:
        print(f"Error: Could not find file: {e}")
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON format: {e}")
    except Exception as e:
        print(f"Unexpected error occurred: {e}")

if __name__ == "__main__":
    process_data()

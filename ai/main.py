from ollama import chat
from pydantic import BaseModel
from typing import Literal, List, Union

class ActionBase(BaseModel):
    description: str

class OpenUrlAction(ActionBase):
    id: Literal['open_url']
    url: str

class RevealPathAction(ActionBase):
    id: Literal['reveal_path']
    path: str 

Action = Union[OpenUrlAction, RevealPathAction]

class ActionResponse(BaseModel):
    actions: List[Action]
    
def process_command(prompt):
	response = chat(
		messages=[
			{
				'role': 'system',
				'content': 'You are a friendly AI assistant who helps the user manage their desktop computer, do not add unnecessary actions.' 
			},
			{
				'role': 'user',
				'content': prompt,
			}
		],
		model='qwen2.5:7b',
		format=ActionResponse.model_json_schema()
	)
    
	actions = ActionResponse.model_validate_json(response.message.content)
	print(actions)

while True:
    process_command(input("> "))
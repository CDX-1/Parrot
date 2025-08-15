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

response = chat(
	messages=[
		{
			'role': 'user',
      		'content': 'Open youtube',
    	}
  	],
  	model='qwen2.5:7b',
  	format=ActionResponse.model_json_schema(),
)

country = ActionResponse.model_validate_json(response.message.content)
print(country)
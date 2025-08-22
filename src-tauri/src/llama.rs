use std::process::{Child, Command, Stdio};

use ollama_rs::{
    generation::{
        chat::{request::ChatMessageRequest, ChatMessage},
        parameters::{FormatType, JsonStructure},
    },
    Ollama,
};
use schemars::Schema;
use serde::Deserialize;

#[derive(Deserialize)]
pub struct Message {
    role: String,
    content: String,
}

pub struct ParrotLlama {
    process: Option<Child>,
    ollama: Ollama,
    host: String,
    port: u16,
}

impl ParrotLlama {
    pub fn new() -> Self {
        let host = "http://localhost".to_string();
        let port = 51821;

        Self {
            process: None,
            ollama: Ollama::new(host.clone(), port),
            host,
            port,
        }
    }

    pub fn run(&mut self) {
        // Spawn the Ollama server
        let process = Command::new("ollama")
            .arg("serve")
            .env("OLLAMA_HOST", format!("{}:{}", self.host.to_string(), self.port.to_string()))
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .spawn()
            .expect("Failed to start Ollama server");

        self.process = Some(process);

        println!("Started Ollama server");
    }

    pub fn check_server(&mut self) -> bool {
        let process = match &mut self.process {
            Some(p) => p,
            None => {
                println!("Process is not set");
                return false;
            }
        };

        match process.try_wait() {
            Ok(Some(status)) => {
                println!("Ollama server exited with: {}", status);
                return false;
            }
            Ok(None) => {
                return true;
            }
            Err(e) => {
                eprintln!("Error checking Ollama server status: {}", e);
                return false;
            }
        }
    }

    pub async fn prompt(
        &mut self,
        model: String,
        messages: Vec<Message>,
        schema: String,
    ) -> Result<String, String> {
        let chat_messages = messages
            .into_iter()
            .map(|m| match m.role.as_str() {
                "user" => ChatMessage::user(m.content),
                "assistant" => ChatMessage::assistant(m.content),
                "system" => ChatMessage::system(m.content),
                _ => ChatMessage::user(m.content),
            })
            .collect();

        let mut request = ChatMessageRequest::new(model, chat_messages);

        if !schema.is_empty() {
            match serde_json::from_str::<Schema>(&schema) {
                Ok(parsed_schema) => {
                    let json_structure = JsonStructure::new_for_schema(parsed_schema);
                    request = request.format(FormatType::StructuredJson(Box::new(json_structure)));
                }
                Err(e) => {
                    return Err(format!("Failed to parse JSON schema: {}", e));
                }
            }
        }

        match self.ollama.send_chat_messages(request).await {
            Ok(response) => {
                let content = response.message.content;
                if content.is_empty() || content.trim().is_empty() {
                    Ok("Null response".to_string())
                } else {
                    Ok(content)
                }
            }
            Err(e) => Err(format!("Ollama error: {}", e)),
        }
    }
}

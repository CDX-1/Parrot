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
struct Message {
    role: String,
    content: String,
}

#[tauri::command]
async fn process_ollama_command(
    ollama: tauri::State<'_, Ollama>,
    model: String,
    messages: Vec<Message>,
    schema: String,
) -> Result<String, String> {
    let chat_messages: Vec<ChatMessage> = messages
        .into_iter()
        .map(|m| match m.role.as_str() {
            "user" => ChatMessage::user(m.content),
            "assistant" => ChatMessage::assistant(m.content),
            "system" => ChatMessage::system(m.content),
            _ => ChatMessage::user(m.content),
        })
        .collect();

    let mut request: ChatMessageRequest = ChatMessageRequest::new(model, chat_messages);
    request = request.think(true);

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

    match ollama.send_chat_messages(request).await {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let ollama = Ollama::default();

    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(ollama)
        .invoke_handler(tauri::generate_handler![process_ollama_command])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

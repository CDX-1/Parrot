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

#[derive(Deserialize, serde::Serialize)]
struct InstalledApp {
    name: String,
    path: String,
    version: Option<String>,
    publisher: Option<String>
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

#[tauri::command]
fn get_installed_programs() -> Vec<InstalledApp> {
    #[cfg(target_os = "windows")]
    {
        let mut apps = Vec::new();
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let uninstall_paths = [
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
            "SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        ];

        for path in &uninstall_paths {
            if let Ok(uninstall) = hklm.open_subkey(path) {
                for subkey in uninstall.enum_keys().flatten() {
                    if let Ok(subkey) = uninstall.open_subkey(&subkey) {
                        let name: Result<String, _> = subkey.get_value("DisplayName");
                        if let Ok(name) = name {
                            let version = subkey.get_value("DisplayVersion").ok();
                            let publisher = subkey.get_value("Publisher").ok();
                            apps.push(InstalledApp { name, version, publisher });
                        }
                    }
                }
            }
        }
        apps
    }

    #[cfg(target_os = "macos")]
    {
        use std::fs;

        let mut apps = Vec::new();
        if let Ok(entries) = fs::read_dir("/Applications") {
            for entry in entries.flatten() {
                let path = entry.path();
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    // Remove .app extension for display
                    let display_name = name.strip_suffix(".app").unwrap_or(name).to_string();
                    apps.push(InstalledApp {
                        name: display_name,
                        path: path.to_string_lossy().to_string(),
                        version: None,
                        publisher: None,
                    });
                }
            }
        }
        apps
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        Vec::new()
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
        .invoke_handler(tauri::generate_handler![
            process_ollama_command,
            get_installed_programs
        ])
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

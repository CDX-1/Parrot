use std::sync::Arc;

use tauri::Manager;
use tokio::sync::Mutex;

use crate::llama::{Message, ParrotLlama};

mod llama;

#[tauri::command]
async fn prompt_llama(
    parrot_llama: tauri::State<'_, Arc<Mutex<ParrotLlama>>>,
    model: String,
    messages: Vec<Message>,
    schema: String
) -> Result<String, String> {
    let mut llama = parrot_llama.lock().await;
    llama.prompt(model, messages, schema).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

			// Run and manage Ollama server
			let parrot_llama = Arc::new(Mutex::new(ParrotLlama::new()));
            app.manage(parrot_llama.clone());
            
            {
                let llama = parrot_llama.clone();
                tauri::async_runtime::spawn(async move {
                    let mut llama = llama.lock().await;
                    llama.run();
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![prompt_llama])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

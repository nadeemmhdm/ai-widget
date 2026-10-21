const SERVICE: &str = "com.nook.aidesktoppet";
const CLOUD_KEY_USER: &str = "ollama-cloud-api-key";

#[cfg(target_os = "windows")]
fn entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(SERVICE, CLOUD_KEY_USER).map_err(|e| e.to_string())
}

pub fn set_cloud_api_key_value(value: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            return Err("API key cannot be empty.".into());
        }
        return entry()?.set_password(trimmed).map_err(|e| e.to_string());
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = value;
        Err("Secure API-key storage is enabled in the Windows build.".into())
    }
}

pub fn get_cloud_api_key_value() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        entry().ok()?.get_password().ok().filter(|v| !v.trim().is_empty())
    }
    #[cfg(not(target_os = "windows"))]
    {
        None
    }
}

pub fn has_cloud_api_key_value() -> bool {
    get_cloud_api_key_value().is_some()
}

pub fn delete_cloud_api_key_value() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        match entry()?.delete_credential() {
            Ok(()) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(())
    }
}

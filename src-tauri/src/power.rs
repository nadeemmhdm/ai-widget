use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PowerStatus {
    pub on_ac_power: Option<bool>,
    pub battery_percent: Option<u8>,
    pub battery_saver_recommended: bool,
}

#[cfg(windows)]
pub fn read_power_status() -> Result<PowerStatus, String> {
    use windows_sys::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};

    let mut status: SYSTEM_POWER_STATUS = unsafe { std::mem::zeroed() };
    let ok = unsafe { GetSystemPowerStatus(&mut status) };
    if ok == 0 {
        return Err("Windows power status is unavailable.".into());
    }

    let on_ac_power = match status.ACLineStatus {
        0 => Some(false),
        1 => Some(true),
        _ => None,
    };
    let battery_percent = if status.BatteryLifePercent == 255 {
        None
    } else {
        Some(status.BatteryLifePercent.min(100))
    };
    let battery_saver_recommended = matches!((on_ac_power, battery_percent), (Some(false), Some(percent)) if percent <= 35);

    Ok(PowerStatus {
        on_ac_power,
        battery_percent,
        battery_saver_recommended,
    })
}

#[cfg(not(windows))]
pub fn read_power_status() -> Result<PowerStatus, String> {
    Ok(PowerStatus {
        on_ac_power: None,
        battery_percent: None,
        battery_saver_recommended: false,
    })
}

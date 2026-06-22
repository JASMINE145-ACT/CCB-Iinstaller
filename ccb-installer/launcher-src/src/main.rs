#![windows_subsystem = "windows"]

use std::os::windows::process::CommandExt;
use std::path::PathBuf;

const CREATE_NO_WINDOW: u32 = 0x08000000;

fn main() {
    let exe_path = std::env::current_exe().expect("cannot resolve exe path");
    let install_dir: PathBuf = exe_path
        .parent()
        .expect("no parent dir")
        .to_path_buf();

    let launcher = install_dir.join("ccb-launch-aionui.cmd");

    std::process::Command::new("cmd.exe")
        .args(["/c", launcher.to_str().unwrap_or("ccb-launch-aionui.cmd")])
        .current_dir(&install_dir)
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .expect("failed to launch ccb-launch-aionui.cmd");
}

export const NATIVE_FOLDER_PICKER_BLOCKED_MESSAGE =
  'The app needs to restart before macOS can open another folder picker. Restart the app and try again.'

let nativeFolderPickerBlocked = false

export function markNativeFolderPickerBlocked(): void {
  nativeFolderPickerBlocked = true
}

export function isNativeFolderPickerBlocked(): boolean {
  return nativeFolderPickerBlocked
}

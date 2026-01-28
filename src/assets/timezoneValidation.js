export default function isValidTimeZone(tz) {
    try {
        Intl.DateTimeFormat(undefined, { timeZone: tz })
        return true
    } catch {
        return false
    }
}

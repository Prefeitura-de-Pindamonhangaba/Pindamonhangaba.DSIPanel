export function parseGlpiDate(
  value: string | null,
  timeZone: string,
): string | null {
  if (!value) return null;
  const [date, time] = value.split(" ");
  if (!date || !time) throw new Error("Data GLPI inválida.");
  const utc = Date.parse(`${date}T${time}Z`);
  if (
    !Number.isFinite(utc) ||
    new Date(utc).toISOString().slice(0, 19).replace("T", " ") !== value
  )
    throw new Error("Data GLPI inválida.");
  let actual = utc;
  for (let attempt = 0; attempt < 2; attempt++) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    }).formatToParts(new Date(actual));
    const offset =
      parts
        .find((part) => part.type === "timeZoneName")!
        .value.replace("GMT", "") || "+00:00";
    actual = Date.parse(`${date}T${time}${offset}`);
  }
  return new Date(actual).toISOString();
}

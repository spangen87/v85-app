/**
 * Händelser som används för att koppla ihop UI-delar som inte delar
 * React-träd — t.ex. tomma startsidan (i MainPageClient) och spelväljaren
 * som ligger i sidhuvudet.
 */
export const OPEN_GAME_PICKER_EVENT = "travappen:open-game-picker";

/** Öppnar spelkontrollerna i sidhuvudet och fäller ut spelväljaren. */
export function openGamePicker() {
  window.dispatchEvent(new Event(OPEN_GAME_PICKER_EVENT));
}

# Jigu English reading - content and narrator credits

- Book: *I Like to Read!* (African Storybook, Storybooks Canada story ID 0087).
- Original writing: Letta Machoga; illustrations: Wiehan de Jager.
- Original English narration: Darshan Soni (recorded at UBC Studios; Global Storybooks audio project).
- Story and original English recording license: [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), with full creator attribution.
- Story: https://storybookscanada.ca/stories/en/0087/
- Audio source: https://globalstorybooks.net/media/audio/en/0087/
- Audio license and description: https://github.com/global-asp/gsn-audio
- Jigu adds its own Chinese support, optional reading tips, layout and progress functionality. Jigu is not endorsed by the publishers.

## Audio production

The original audiobook provides an MP3 for the cover, and MP3 segments 02-09 for the eight body pages.
The GitHub Pages workflow stages only 02-09 during the build, remapping to local `public/books/read/audio/01.mp3` ... `08.mp3`. Only the staged media gets deployed, not the full 80 MB language download.

On the website, bundled licensed audio is preferred. If an audio asset fails to load, a trusted original audio URL is attempted, and device TTS is used only as a last-resort fallback. The fallback status is explicitly displayed to the user.

Audio has been validated automatically for file existence and MP3 frame format; perceived performance and mobile audio behavior still require human listening on iOS and Android.
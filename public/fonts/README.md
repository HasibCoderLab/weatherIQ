# Icon font

`material-symbols-outlined.woff2` is a **subset** of Material Symbols Outlined
containing only the ligatures WeatherIQ uses (~6 KB vs ~4 MB for the full
variable font).

## Regenerating after adding a new icon

1. Add the icon name to the `icon_names` list in the URL below (comma-separated,
   snake_case, e.g. `thunderstorm`).
2. Open in a browser (a Chrome-family User-Agent is required so Google serves
   woff2):

   ```
   https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=air,ac_unit,bookmark_add,bookmark_added,bookmarks,brightness_3,calendar_view_day,cloud,cloud_off,compress,dark_mode,delete,edit,expand_more,foggy,home,humidity_percentage,insights,keyboard_arrow_down,keyboard_arrow_up,light_mode,more_vert,my_location,nights_stay,partly_cloudy_day,rainy,refresh,routine,schedule,search,storm,thunderstorm,travel_explore,umbrella,visibility,water_drop,wb_sunny,wb_twilight,weather_snowy,wifi_off,wrong_location&display=block
   ```

3. Download the `.woff2` URL from the returned CSS and replace the file here.

The `@font-face` rule lives in `src/styles/globals.css` (`@layer base`), so
Tailwind size utilities (e.g. `text-2xl`) keep overriding the icon class.

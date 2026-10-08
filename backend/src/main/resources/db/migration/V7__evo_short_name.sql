-- Keep the track name short enough for the selector; the city goes in the subtitle line.
UPDATE tracks
SET name = 'Evolution Race Park', name_ru = 'Evolution Race Park',
    country = 'Rostov-on-Don, Russia', country_ru = 'Ростов-на-Дону, Россия'
WHERE name = 'Evolution Race Park (Rostov-on-Don)';

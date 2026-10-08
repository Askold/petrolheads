-- Localised track names, plus active Russian circuits.
-- Lengths from Wikipedia (ru/en) as of 2026-10; NULL where no reliable figure was found.
ALTER TABLE tracks
    ADD COLUMN name_ru    VARCHAR(128),
    ADD COLUMN layout_ru  VARCHAR(64),
    ADD COLUMN country_ru VARCHAR(64);

UPDATE tracks SET name_ru = 'Нюрбургринг Нордшляйфе', layout_ru = 'Touristenfahrten', country_ru = 'Германия'
WHERE name = 'Nürburgring Nordschleife';
UPDATE tracks SET name_ru = 'Спа-Франкоршам', layout_ru = 'Гран-при', country_ru = 'Бельгия'
WHERE name = 'Spa-Francorchamps';
UPDATE tracks SET name_ru = 'Хоккенхаймринг', layout_ru = 'Гран-при', country_ru = 'Германия'
WHERE name = 'Hockenheimring';

INSERT INTO tracks (name, layout, country, length_m, name_ru, layout_ru, country_ru) VALUES
    ('Moscow Raceway',            'Full Circuit',    'Russia', 4070, 'Moscow Raceway',           'Полная',            'Россия'),
    ('Moscow Raceway',            'Grand Prix',      'Russia', 3955, 'Moscow Raceway',           'Гран-при',          'Россия'),
    ('Moscow Raceway',            'Sprint',          'Russia', 2661, 'Moscow Raceway',           'Спринт',            'Россия'),
    ('Igora Drive',               'Grand Prix',      'Russia', 5183, 'Игора Драйв',              'Гран-при',          'Россия'),
    ('Igora Drive',               'Original',        'Russia', 4086, 'Игора Драйв',              'Классическая',      'Россия'),
    ('Kazan Ring',                NULL,              'Russia', 3476, 'Казань Ринг',              NULL,                'Россия'),
    ('Sirius Autodrom',           'Club',            'Russia', 2313, 'Сириус Автодром',          'Клубная',           'Россия'),
    ('NRING',                     'Configuration A', 'Russia', 3222, 'Нижегородское кольцо',     'Конфигурация A',    'Россия'),
    ('NRING',                     'Configuration B', 'Russia', 2850, 'Нижегородское кольцо',     'Конфигурация B',    'Россия'),
    ('NRING',                     'Configuration C', 'Russia', 2009, 'Нижегородское кольцо',     'Конфигурация C',    'Россия'),
    ('Smolensk Ring',             NULL,              'Russia', 3357, 'Смоленское кольцо',        NULL,                'Россия'),
    ('Fort Grozny',               NULL,              'Russia', 3086, 'Крепость Грозная',         NULL,                'Россия'),
    ('Red Ring',                  NULL,              'Russia', 2160, 'Красное кольцо',           NULL,                'Россия'),
    ('ADM Raceway',               NULL,              'Russia', NULL, 'ADM Raceway (Мячково)',    NULL,                'Россия'),
    ('Atron',                     NULL,              'Russia', NULL, 'Атрон',                    NULL,                'Россия');

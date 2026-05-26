insert into public.delivery_zones (name, is_active, delivery_fee)
values
  ('Curridabat', true, 0),
  ('Montes de Oca', true, 0),
  ('Granadilla', true, 0),
  ('Tres Ríos', true, 0),
  ('San Ramón de Tres Ríos', true, 0)
on conflict (name) do nothing;

insert into public.products (
  slug,
  name,
  description,
  price,
  stock,
  pet_type,
  category,
  weight,
  is_active
)
values
  (
    'dog-chow-adultos-8kg',
    'Dog Chow Adultos 8kg',
    'Alimento seco para perro adulto.',
    18500,
    8,
    'perro',
    'alimento-seco',
    '8 kg',
    true
  ),
  (
    'cat-chow-adultos-1-5kg',
    'Cat Chow Adultos 1.5kg',
    'Alimento seco para gato adulto.',
    6500,
    10,
    'gato',
    'alimento-seco',
    '1.5 kg',
    true
  ),
  (
    'pedigree-cachorro-4kg',
    'Pedigree Cachorro 4kg',
    'Alimento seco para cachorro.',
    11200,
    5,
    'perro',
    'alimento-seco',
    '4 kg',
    true
  ),
  (
    'whiskas-pescado-85g',
    'Whiskas Pescado 85g',
    'Alimento húmedo para gato.',
    850,
    20,
    'gato',
    'alimento-humedo',
    '85 g',
    true
  ),
  (
    'pro-plan-adult-dog-3kg',
    'Pro Plan Adult Dog 3kg',
    'Alimento seco premium para perro adulto.',
    24500,
    4,
    'perro',
    'alimento-seco',
    '3 kg',
    true
  ),
  (
    'pro-plan-cat-adult-1-5kg',
    'Pro Plan Cat Adult 1.5kg',
    'Alimento seco premium para gato adulto.',
    16800,
    6,
    'gato',
    'alimento-seco',
    '1.5 kg',
    true
  ),
  (
    'dog-chow-cachorros-2kg',
    'Dog Chow Cachorros 2kg',
    'Alimento seco para cachorros.',
    7200,
    7,
    'perro',
    'alimento-seco',
    '2 kg',
    true
  ),
  (
    'pedigree-pouch-carne-100g',
    'Pedigree Pouch Carne 100g',
    'Alimento húmedo para perro.',
    950,
    18,
    'perro',
    'alimento-humedo',
    '100 g',
    true
  )
on conflict (slug) do nothing;

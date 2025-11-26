-- Удаляем уникальное ограничение на код
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_code_key;

-- Создаем частичный уникальный индекс только для активных продуктов
CREATE UNIQUE INDEX products_code_active_unique 
ON products (code) 
WHERE is_active = true;

-- Это позволит использовать один и тот же код для удаленных продуктов,
-- но активные продукты должны иметь уникальные коды
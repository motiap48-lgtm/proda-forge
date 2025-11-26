-- Функция для генерации следующего кода продукта
CREATE OR REPLACE FUNCTION generate_product_code(p_product_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix text;
  last_number integer;
  next_code text;
BEGIN
  -- Определяем префикс по типу продукта
  prefix := CASE p_product_type
    WHEN 'material' THEN 'МАТ'
    WHEN 'semi-finished' THEN 'ПФ'
    WHEN 'assembly' THEN 'СБ'
    WHEN 'finished' THEN 'ГП'
    ELSE 'PROD'
  END;

  -- Находим максимальный номер для данного типа
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(code FROM '[0-9]+$') AS integer
      )
    ),
    0
  )
  INTO last_number
  FROM products
  WHERE product_type = p_product_type
    AND is_active = true
    AND code ~ (prefix || '-[0-9]+$');

  -- Генерируем следующий код
  next_code := prefix || '-' || LPAD((last_number + 1)::text, 3, '0');
  
  RETURN next_code;
END;
$$;

-- Функция-триггер для автогенерации кода
CREATE OR REPLACE FUNCTION auto_generate_product_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Если код пустой или начинается с AUTO, генерируем новый
  IF NEW.code IS NULL OR NEW.code = '' OR NEW.code LIKE 'AUTO%' THEN
    NEW.code := generate_product_code(NEW.product_type);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Создаем триггер
DROP TRIGGER IF EXISTS trigger_auto_generate_product_code ON products;
CREATE TRIGGER trigger_auto_generate_product_code
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_product_code();
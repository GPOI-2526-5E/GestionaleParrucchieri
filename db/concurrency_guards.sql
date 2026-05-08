-- Esegui questo file nel SQL editor di Supabase prima di pubblicare il sito.
-- Le funzioni sotto proteggono appuntamenti e checkout anche con piu istanze server online.

CREATE INDEX IF NOT EXISTS idx_appuntamenti_operatore_periodo
  ON public.appuntamenti ("idOperatore", "dataOraInizio", "dataOraFine");

DROP FUNCTION IF EXISTS public.create_appuntamento_sicuro(
  integer,
  integer,
  timestamp without time zone,
  timestamp without time zone,
  integer,
  text,
  text
);

DROP FUNCTION IF EXISTS public.update_appuntamento_sicuro(
  integer,
  timestamp without time zone,
  timestamp without time zone,
  text,
  text,
  boolean,
  integer
);

DROP FUNCTION IF EXISTS public.decrement_product_stock_sicuro(jsonb);
DROP FUNCTION IF EXISTS public.complete_checkout_sicuro(integer, numeric, jsonb);

CREATE OR REPLACE FUNCTION public.create_appuntamento_sicuro(
  p_id_cliente integer,
  p_id_operatore integer,
  p_data_ora_inizio timestamp without time zone,
  p_data_ora_fine timestamp without time zone,
  p_id_servizio integer DEFAULT NULL,
  p_stato text DEFAULT 'prenotato',
  p_note text DEFAULT NULL
)
RETURNS SETOF public.appuntamenti
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_appuntamento integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('appointments:operator:' || p_id_operatore::text, 0));

  IF EXISTS (
    SELECT 1
    FROM public.appuntamenti a
    WHERE a."idOperatore" = p_id_operatore
      AND p_data_ora_inizio < GREATEST(a."dataOraFine", a."dataOraInizio" + interval '30 minutes')
      AND GREATEST(p_data_ora_fine, p_data_ora_inizio + interval '30 minutes') > a."dataOraInizio"
  ) THEN
    RAISE EXCEPTION 'operator_unavailable' USING ERRCODE = 'P0001';
  END IF;

  EXECUTE
    'INSERT INTO public.appuntamenti (
      "idCliente",
      "idOperatore",
      "dataOraInizio",
      "dataOraFine",
      "stato",
      "note"
    )
    VALUES ($1, $2, $3, $4, ' || quote_nullable(COALESCE(p_stato, 'prenotato')) || ', $5)
    RETURNING "idAppuntamento"'
  INTO v_id_appuntamento
  USING p_id_cliente, p_id_operatore, p_data_ora_inizio, p_data_ora_fine, p_note;

  IF p_id_servizio IS NOT NULL THEN
    INSERT INTO public.appuntamentiservizi ("idAppuntamento", "idServizio")
    VALUES (v_id_appuntamento, p_id_servizio);
  END IF;

  RETURN QUERY
    SELECT a.*
    FROM public.appuntamenti a
    WHERE a."idAppuntamento" = v_id_appuntamento;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_appuntamento_sicuro(
  p_id_appuntamento integer,
  p_data_ora_inizio timestamp without time zone,
  p_data_ora_fine timestamp without time zone,
  p_stato text,
  p_note text,
  p_update_servizio boolean DEFAULT false,
  p_id_servizio integer DEFAULT NULL
)
RETURNS SETOF public.appuntamenti
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_operatore integer;
BEGIN
  SELECT a."idOperatore"
  INTO v_id_operatore
  FROM public.appuntamenti a
  WHERE a."idAppuntamento" = p_id_appuntamento;

  IF v_id_operatore IS NULL THEN
    RAISE EXCEPTION 'appointment_not_found' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('appointments:operator:' || v_id_operatore::text, 0));

  IF EXISTS (
    SELECT 1
    FROM public.appuntamenti a
    WHERE a."idOperatore" = v_id_operatore
      AND a."idAppuntamento" <> p_id_appuntamento
      AND p_data_ora_inizio < GREATEST(a."dataOraFine", a."dataOraInizio" + interval '30 minutes')
      AND GREATEST(p_data_ora_fine, p_data_ora_inizio + interval '30 minutes') > a."dataOraInizio"
  ) THEN
    RAISE EXCEPTION 'operator_unavailable' USING ERRCODE = 'P0001';
  END IF;

  EXECUTE
    'UPDATE public.appuntamenti
    SET
      "dataOraInizio" = $1,
      "dataOraFine" = $2,
      "stato" = ' || quote_nullable(COALESCE(p_stato, 'prenotato')) || ',
      "note" = $3
    WHERE "idAppuntamento" = $4'
  USING p_data_ora_inizio, p_data_ora_fine, p_note, p_id_appuntamento;

  IF p_update_servizio THEN
    DELETE FROM public.appuntamentiservizi
    WHERE "idAppuntamento" = p_id_appuntamento;

    IF p_id_servizio IS NOT NULL THEN
      INSERT INTO public.appuntamentiservizi ("idAppuntamento", "idServizio")
      VALUES (p_id_appuntamento, p_id_servizio);
    END IF;
  END IF;

  RETURN QUERY
    SELECT a.*
    FROM public.appuntamenti a
    WHERE a."idAppuntamento" = p_id_appuntamento;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_product_stock_sicuro(p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_updated_count integer;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'cart_empty' USING ERRCODE = 'P0001';
  END IF;

  FOR v_item IN
    SELECT
      (item->>'productId')::integer AS product_id,
      SUM((item->>'qty')::integer)::integer AS qty
    FROM jsonb_array_elements(p_items) item
    GROUP BY (item->>'productId')::integer
    ORDER BY (item->>'productId')::integer
  LOOP
    IF v_item.product_id IS NULL OR v_item.qty IS NULL OR v_item.qty <= 0 THEN
      RAISE EXCEPTION 'invalid_cart_item' USING ERRCODE = 'P0001';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('products:stock:' || v_item.product_id::text, 0));
  END LOOP;

  FOR v_item IN
    SELECT
      (item->>'productId')::integer AS product_id,
      SUM((item->>'qty')::integer)::integer AS qty
    FROM jsonb_array_elements(p_items) item
    GROUP BY (item->>'productId')::integer
    ORDER BY (item->>'productId')::integer
  LOOP
    UPDATE public.prodotti
    SET "quantitaMagazzino" = "quantitaMagazzino" - v_item.qty
    WHERE "idProdotto" = v_item.product_id
      AND "quantitaMagazzino" >= v_item.qty;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    IF v_updated_count = 0 THEN
      IF EXISTS (SELECT 1 FROM public.prodotti WHERE "idProdotto" = v_item.product_id) THEN
        RAISE EXCEPTION 'stock_insufficiente' USING ERRCODE = 'P0001';
      END IF;

      RAISE EXCEPTION 'product_not_found' USING ERRCODE = 'P0001';
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_checkout_sicuro(
  p_id_cliente integer,
  p_total numeric,
  p_items jsonb
)
RETURNS TABLE ("idVendita" integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_updated_count integer;
  v_id_vendita integer;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'cart_empty' USING ERRCODE = 'P0001';
  END IF;

  IF p_total IS NULL OR p_total <= 0 THEN
    RAISE EXCEPTION 'invalid_total' USING ERRCODE = 'P0001';
  END IF;

  FOR v_item IN
    SELECT
      (item->>'productId')::integer AS product_id,
      SUM((item->>'qty')::integer)::integer AS qty
    FROM jsonb_array_elements(p_items) item
    GROUP BY (item->>'productId')::integer
    ORDER BY (item->>'productId')::integer
  LOOP
    IF v_item.product_id IS NULL OR v_item.qty IS NULL OR v_item.qty <= 0 THEN
      RAISE EXCEPTION 'invalid_cart_item' USING ERRCODE = 'P0001';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('products:stock:' || v_item.product_id::text, 0));
  END LOOP;

  INSERT INTO public.vendite ("idCliente", "data", "totale")
  VALUES (p_id_cliente, now(), p_total)
  RETURNING public.vendite."idVendita" INTO v_id_vendita;

  FOR v_item IN
    SELECT
      (item->>'productId')::integer AS product_id,
      SUM((item->>'qty')::integer)::integer AS qty
    FROM jsonb_array_elements(p_items) item
    GROUP BY (item->>'productId')::integer
    ORDER BY (item->>'productId')::integer
  LOOP
    UPDATE public.prodotti
    SET "quantitaMagazzino" = "quantitaMagazzino" - v_item.qty
    WHERE "idProdotto" = v_item.product_id
      AND "quantitaMagazzino" >= v_item.qty;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    IF v_updated_count = 0 THEN
      IF EXISTS (SELECT 1 FROM public.prodotti WHERE "idProdotto" = v_item.product_id) THEN
        RAISE EXCEPTION 'stock_insufficiente' USING ERRCODE = 'P0001';
      END IF;

      RAISE EXCEPTION 'product_not_found' USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  INSERT INTO public.dettagliovendita (
    "idVendita",
    "idProdotto",
    "quantita",
    "prezzoUnitario"
  )
  SELECT
    v_id_vendita,
    (item->>'productId')::integer,
    SUM((item->>'qty')::integer)::integer,
    MAX((item->>'prezzoUnitario')::numeric)
  FROM jsonb_array_elements(p_items) item
  GROUP BY (item->>'productId')::integer;

  RETURN QUERY SELECT v_id_vendita;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_appuntamento_sicuro(
  integer,
  integer,
  timestamp without time zone,
  timestamp without time zone,
  integer,
  text,
  text
) TO service_role;

GRANT EXECUTE ON FUNCTION public.update_appuntamento_sicuro(
  integer,
  timestamp without time zone,
  timestamp without time zone,
  text,
  text,
  boolean,
  integer
) TO service_role;

GRANT EXECUTE ON FUNCTION public.decrement_product_stock_sicuro(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_checkout_sicuro(integer, numeric, jsonb) TO service_role;

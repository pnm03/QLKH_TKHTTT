-- Create function to get top shipped products
CREATE OR REPLACE FUNCTION get_top_shipped_products_v2(limit_count INTEGER)
RETURNS TABLE (
  product_name TEXT,
  shipment_count BIGINT
) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    p.product_name, 
    COUNT(od.product_id) as shipment_count
  FROM 
    orderdetails od
  JOIN 
    products p ON od.product_id = p.product_id
  JOIN 
    orders o ON od.order_id = o.order_id
  WHERE 
    o.is_shipping = true
  GROUP BY 
    p.product_name
  ORDER BY 
    shipment_count DESC
  LIMIT 
    limit_count;
$$;

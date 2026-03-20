class InventoryEngine:
    def __init__(self):
        self.products = {}
        self.total_sales = 0.0
        self.gross_profit = 0.0

    def create(self, product_id, stock, cost, price, tracks_stock=True):

        if product_id in self.products:
            return

        self.products[product_id] = {
            "stock": stock if tracks_stock else 0,
            "cost": cost,
            "price": price,
            "tracks_stock": tracks_stock
        }

    def intake(self, product_id, qty, cost=None, price=None):

        if product_id not in self.products:
            return

        p = self.products[product_id]

        if p["tracks_stock"]:
            p["stock"] += qty

        if cost is not None:
            p["cost"] = cost

        if price is not None:
            p["price"] = price

    def price_change(self, product_id, cost=None, price=None):

        if product_id not in self.products:
            return

        p = self.products[product_id]

        if cost is not None:
            p["cost"] = cost

        if price is not None:
            p["price"] = price

    def sale(self, product_id, qty):

        if product_id not in self.products:
            return

        p = self.products[product_id]

        if p["tracks_stock"]:
            p["stock"] -= qty
        else:
            p["stock"] += qty

        self.total_sales += qty * p["price"]
        self.gross_profit += qty * (p["price"] - p["cost"])

    def loss(self, product_id, qty):

        if product_id not in self.products:
            return

        p = self.products[product_id]

        if p["tracks_stock"]:
            p["stock"] -= qty

    def inventory_value(self):

        total = 0

        for p in self.products.values():

            if p["tracks_stock"]:
                total += p["stock"] * p["cost"]

        return total
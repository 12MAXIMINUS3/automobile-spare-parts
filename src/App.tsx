import { AnimatePresence, motion } from "framer-motion";
import { Route, Routes, useLocation } from "react-router-dom";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Toaster from "./components/Toaster";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Home from "./pages/Home";
import ProductDetail from "./pages/ProductDetail";
import Products from "./pages/Products";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminProducts from "./pages/admin/AdminProducts";
import Overview from "./pages/admin/Overview";

export default function App() {
  const location = useLocation();
  // Keyed on pathname only, so changing ?query filters doesn't replay the page transition.
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Overview />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="orders" element={<AdminOrders />} />
              </Route>
              <Route path="*" element={<div className="py-32 text-center text-lg font-semibold">Page not found</div>} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}

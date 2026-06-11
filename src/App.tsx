import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import HomePage from "@/pages/home/HomePage";
import ItemListPage from "@/pages/items/ItemListPage";
import ItemDetailPage from "@/pages/items/ItemDetailPage";
import ItemFormPage from "@/pages/items/ItemFormPage";
import SearchPage from "@/pages/search/SearchPage";
import ExpiryLogPage from "@/pages/expiry/ExpiryLogPage";
import StatsPage from "@/pages/stats/StatsPage";
import MyPage from "@/pages/mypage/MyPage";
import SkinTrackingPage from "@/pages/mypage/SkinTrackingPage";
import AestheticPage from "@/pages/mypage/AestheticPage";
import AestheticFormPage from "@/pages/mypage/AestheticFormPage";
import PurchaseFormPage from "@/pages/mypage/PurchaseFormPage";
import AestheticDetailPage from "@/pages/mypage/AestheticDetailPage";
import ProfilePage from "@/pages/mypage/ProfilePage";
import WishlistPage from "@/pages/wishlist/WishlistPage";
import WishlistDetailPage from "@/pages/wishlist/WishlistDetailPage";
import CategoriesPage from "@/pages/mypage/CategoriesPage";
import ChannelsPage from "@/pages/mypage/ChannelsPage";
import MedicationListPage from "@/pages/medications/MedicationListPage";
import MedicationDetailPage from "@/pages/medications/MedicationDetailPage";
import MedicationFormPage from "@/pages/medications/MedicationFormPage";
import ToolListPage from "@/pages/tools/ToolListPage";
import ToolDetailPage from "@/pages/tools/ToolDetailPage";
import ToolFormPage from "@/pages/tools/ToolFormPage";
import NotificationsPage from "@/pages/mypage/NotificationsPage";
import { CategoriesProvider } from "@/contexts/CategoriesContext";

export default function App() {
  return (
    <BrowserRouter>
      <CategoriesProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="items" element={<ItemListPage />} />
            <Route path="items/new" element={<ItemFormPage />} />
            <Route path="items/:id" element={<ItemDetailPage />} />
            <Route path="items/:id/edit" element={<ItemFormPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="expiry" element={<ExpiryLogPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="my" element={<MyPage />} />
            <Route path="my/skin" element={<SkinTrackingPage />} />
            <Route path="my/aesthetic" element={<AestheticPage />} />
            <Route path="my/aesthetic/new" element={<PurchaseFormPage />} />
            <Route path="my/aesthetic/:id" element={<AestheticDetailPage />} />
            <Route path="my/aesthetic/:id/edit" element={<AestheticFormPage />} />
            <Route path="my/aesthetic/purchase/:purchaseId/edit" element={<PurchaseFormPage />} />
            <Route path="my/profile" element={<ProfilePage />} />
            <Route path="my/wishlist" element={<WishlistPage />} />
            <Route path="my/wishlist/:id" element={<WishlistDetailPage />} />
            <Route path="my/categories" element={<CategoriesPage />} />
            <Route path="my/channels" element={<ChannelsPage />} />
            <Route path="my/notifications" element={<NotificationsPage />} />
            <Route path="my/medications" element={<MedicationListPage />} />
            <Route path="my/medications/new" element={<MedicationFormPage />} />
            <Route path="my/medications/:id" element={<MedicationDetailPage />} />
            <Route path="my/medications/:id/edit" element={<MedicationFormPage />} />
            <Route path="tools" element={<ToolListPage />} />
            <Route path="tools/new" element={<ToolFormPage />} />
            <Route path="tools/:id" element={<ToolDetailPage />} />
            <Route path="tools/:id/edit" element={<ToolFormPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </CategoriesProvider>
    </BrowserRouter>
  );
}

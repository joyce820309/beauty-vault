import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import LoginPage from "@/pages/auth/LoginPage";
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
import WishlistFormPage from "@/pages/wishlist/WishlistFormPage";
import CategoriesPage from "@/pages/mypage/CategoriesPage";
import ChannelsPage from "@/pages/mypage/ChannelsPage";
import MedicationListPage from "@/pages/medications/MedicationListPage";
import MedicationDetailPage from "@/pages/medications/MedicationDetailPage";
import MedicationFormPage from "@/pages/medications/MedicationFormPage";
import ToolListPage from "@/pages/tools/ToolListPage";
import ToolDetailPage from "@/pages/tools/ToolDetailPage";
import ToolFormPage from "@/pages/tools/ToolFormPage";
import NotificationsPage from "@/pages/mypage/NotificationsPage";
import ExportPage from "@/pages/mypage/ExportPage";
import SuggestionsPage from "@/pages/mypage/SuggestionsPage";
import LooksPage from "@/pages/looks/LooksPage";
import LookFormPage from "@/pages/looks/LookFormPage";
import LookDetailPage from "@/pages/looks/LookDetailPage";
import { CategoriesProvider } from "@/contexts/CategoriesContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useNotificationScheduler } from "@/hooks/useNotificationScheduler";

function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] text-sm text-[var(--color-text-muted)]">
        載入中…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

function AppRoutes() {
  useNotificationScheduler()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
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
        <Route path="my/wishlist/new" element={<WishlistFormPage />} />
        <Route path="my/wishlist/:id" element={<WishlistDetailPage />} />
        <Route path="my/wishlist/:id/edit" element={<WishlistFormPage />} />
        <Route path="my/categories" element={<CategoriesPage />} />
        <Route path="my/channels" element={<ChannelsPage />} />
        <Route path="my/suggestions" element={<SuggestionsPage />} />
        <Route path="my/notifications" element={<NotificationsPage />} />
        <Route path="my/export" element={<ExportPage />} />
        <Route path="my/looks" element={<LooksPage />} />
        <Route path="my/looks/new" element={<LookFormPage />} />
        <Route path="my/looks/:id" element={<LookDetailPage />} />
        <Route path="my/looks/:id/edit" element={<LookFormPage />} />
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
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CategoriesProvider>
          <AppRoutes />
        </CategoriesProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

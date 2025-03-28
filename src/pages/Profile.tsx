
import Navbar from "@/components/layout/Navbar";
import ProfileForm from "@/components/profile/ProfileForm";
import ProtectedRoute from "@/components/ProtectedRoute";

const Profile = () => {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-white to-twitter-extraExtraLight">
        <Navbar />
        <div className="page-container">
          <h1 className="text-3xl font-bold mb-8">Your Profile</h1>
          <ProfileForm />
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Profile;

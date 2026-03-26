import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Shield, Users, MapPin, Award } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-teal-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-pink-500 via-purple-600 to-teal-500 bg-clip-text text-transparent leading-tight">
            SafeMove
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-2xl leading-relaxed">
            Connect with verified women athletes for safe group sports activities
          </p>
          <p className="text-lg text-gray-600 max-w-xl">
            Join cycling, running, trekking, and trail adventures with a trusted community
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              asChild
              size="lg"
              className="h-12 px-8 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-lg"
            >
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 px-8 text-lg border-2 border-purple-300 hover:bg-purple-50 bg-transparent"
            >
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20 max-w-6xl mx-auto">
          <div className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Verified Members</h3>
            <p className="text-sm text-gray-600">All members are identity-verified for your safety and peace of mind</p>
          </div>

          <div className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-teal-500 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Community Groups</h3>
            <p className="text-sm text-gray-600">Join groups led by experienced athletes and influencers</p>
          </div>

          <div className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Local Events</h3>
            <p className="text-sm text-gray-600">Discover and join sports events in your area with detailed routes</p>
          </div>

          <div className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-teal-500 rounded-xl flex items-center justify-center mb-4">
              <Award className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Build Reputation</h3>
            <p className="text-sm text-gray-600">Earn reputation points by participating and creating events</p>
          </div>
        </div>
      </div>
    </div>
  )
}

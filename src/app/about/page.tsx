import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, Calendar, Target, Award, BookOpen, Zap } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "About",
  description: "About Limpopo Chess Academy — services, mission and vision.",
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground text-balance">About Limpopo Chess Academy</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-pretty">
            Developing chess excellence across Limpopo through professional coaching, tournaments, and community
            building
          </p>
        </div>

        {/* Services Section */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-card-foreground text-2xl">Services Offered</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Comprehensive chess development programs for all levels
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-secondary rounded-md mt-1">
                    <BookOpen className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Chess Coaching Lessons</h3>
                    <p className="text-muted-foreground text-sm">
                      From 6 years to adults - personalized instruction for all skill levels
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-secondary rounded-md mt-1">
                    <Award className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Arbiters Training Course</h3>
                    <p className="text-muted-foreground text-sm">Professional certification for tournament officials</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-secondary rounded-md mt-1">
                    <Users className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Coaches / Trainers Course</h3>
                    <p className="text-muted-foreground text-sm">Develop the next generation of chess instructors</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-secondary rounded-md mt-1">
                    <Trophy className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Organising Tournaments</h3>
                    <p className="text-muted-foreground text-sm">Professional tournament management and coordination</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-secondary rounded-md mt-1">
                    <Zap className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Swiss Manager Training</h3>
                    <p className="text-muted-foreground text-sm">
                      Master tournament pairing software and management systems
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-secondary rounded-md mt-1">
                    <Target className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Capacity Building</h3>
                    <p className="text-muted-foreground text-sm">
                      Strengthen chess organizations and community programs
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-secondary rounded-md mt-1">
                    <Calendar className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Seminars / Workshops</h3>
                    <p className="text-muted-foreground text-sm">
                      Educational events and specialized training sessions
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-card-foreground text-xl">Our Mission</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-muted-foreground leading-relaxed">
                To promote and develop chess excellence throughout Limpopo Province by providing high-quality coaching,
                organizing competitive tournaments, and building a strong chess community that nurtures talent from
                grassroots to elite levels.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-card-foreground text-xl">Our Vision</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-muted-foreground leading-relaxed">
                To establish Limpopo as a leading chess province in South Africa, producing world-class players,
                certified coaches, and tournament officials while making chess accessible to all communities regardless
                of age or background.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Why Choose Us */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-card-foreground text-2xl">Why Choose Limpopo Chess Academy?</CardTitle>
            <CardDescription className="text-muted-foreground">
              What sets us apart in chess education and development
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center space-y-3">
                <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto">
                  <Award className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">Professional Excellence</h3>
                <p className="text-muted-foreground text-sm">
                  Certified instructors with proven track records in competitive chess and coaching
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">Community Focus</h3>
                <p className="text-muted-foreground text-sm">
                  Building strong chess communities across Limpopo with inclusive programs for all ages
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto">
                  <Trophy className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">Competitive Success</h3>
                <p className="text-muted-foreground text-sm">
                  Regular tournaments and competitions to test skills and build competitive experience
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact CTA */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6 text-center space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Ready to Start Your Chess Journey?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join the Limpopo Chess Academy community and take your chess skills to the next level with our
              professional coaching and competitive programs.
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                All Ages Welcome
              </Badge>
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                Professional Coaching
              </Badge>
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                Tournament Opportunities
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

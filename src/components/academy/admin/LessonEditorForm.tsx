'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createLesson, updateLesson, type LessonWithCategory } from '@/services/lessonService'
import { toast } from 'sonner'
import { Loader2, Save, Eye, FileText, Video, HelpCircle, Puzzle as PuzzleIcon, Layers } from 'lucide-react'
import type { LessonCategory } from '@/services/lessonService'
import { QuizBuilder } from '@/components/academy/admin/QuizBuilder'

interface LessonEditorFormProps {
  lesson?: LessonWithCategory
  categories: LessonCategory[]
  mode: 'create' | 'edit'
}

export default function LessonEditorForm({ lesson, categories, mode }: LessonEditorFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!lesson?.slug)

  // Form state
  const [title, setTitle] = useState(lesson?.title || '')
  const [slug, setSlug] = useState(lesson?.slug || '')
  const [description, setDescription] = useState(lesson?.description || '')
  const [categoryId, setCategoryId] = useState<string>(lesson?.category_id || '')
  const [contentType, setContentType] = useState<'text' | 'video' | 'quiz' | 'puzzle' | 'mixed'>(
    lesson?.content_type || 'text'
  )
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced' | ''>(
    lesson?.difficulty || ''
  )
  const [duration, setDuration] = useState<string>(
    lesson?.estimated_duration_minutes?.toString() || ''
  )
  const [published, setPublished] = useState(lesson?.published || false)

  // Content type specific state
  const [textContent, setTextContent] = useState(
    lesson?.content_type === 'text' ? lesson.content_data?.body || '' : ''
  )
  const [videoUrl, setVideoUrl] = useState(
    lesson?.content_type === 'video' ? lesson.content_data?.url || '' : ''
  )
  const [videoProvider, setVideoProvider] = useState<'youtube' | 'vimeo'>(
    lesson?.content_type === 'video' ? lesson.content_data?.provider || 'youtube' : 'youtube'
  )
  const [quizData, setQuizData] = useState({
    questions: lesson?.content_type === 'quiz' ? lesson.content_data?.questions || [] : [],
    passingScore: lesson?.content_type === 'quiz' ? lesson.content_data?.passingScore || 70 : 70,
    allowRetry: lesson?.content_type === 'quiz' ? lesson.content_data?.allowRetry !== false : true,
    showExplanations: lesson?.content_type === 'quiz' ? lesson.content_data?.showExplanations !== false : true,
  })
  const [puzzleFen, setPuzzleFen] = useState(
    lesson?.content_type === 'puzzle' ? lesson.content_data?.fen || '' : ''
  )
  const [puzzleSolution, setPuzzleSolution] = useState(
    lesson?.content_type === 'puzzle' ? lesson.content_data?.solution || '' : ''
  )

  // Auto-generate slug from title
  const handleTitleChange = (value: string) => {
    setTitle(value)
    // Only auto-generate if user hasn't manually edited the slug
    if (mode === 'create' && !slugManuallyEdited) {
      const generatedSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      setSlug(generatedSlug)
    }
  }

  const handleSlugChange = (value: string) => {
    setSlug(value)
    setSlugManuallyEdited(true)
  }

  const buildContentData = () => {
    switch (contentType) {
      case 'text':
        return {
          type: 'text',
          body: textContent,
          images: [],
        }
      case 'video':
        return {
          type: 'video',
          url: videoUrl,
          provider: videoProvider,
          transcript: '',
          keyPoints: [],
        }
      case 'quiz':
        return {
          type: 'quiz',
          questions: quizData.questions,
          passingScore: quizData.passingScore,
          allowRetry: quizData.allowRetry,
          showExplanations: quizData.showExplanations,
        }
      case 'puzzle':
        return {
          type: 'puzzle',
          fen: puzzleFen,
          solution: puzzleSolution.split(',').map((s: string) => s.trim()),
          description: '',
          explanation: '',
        }
      case 'mixed':
        return {
          type: 'mixed',
          sections: [],
        }
      default:
        return {}
    }
  }

  const handleSubmit = async (e: React.FormEvent, shouldPublish: boolean = published) => {
    e.preventDefault()
    setLoading(true)

    try {
      const lessonData = {
        title,
        slug,
        description,
        category_id: categoryId || undefined,
        content_type: contentType,
        content_data: buildContentData(),
        difficulty: difficulty || undefined,
        estimated_duration_minutes: duration ? parseInt(duration) : undefined,
        published: shouldPublish,
      }

      if (mode === 'create') {
        await createLesson(lessonData)
        toast.success('Lesson created successfully!', {
          description: 'Redirecting to lessons list...',
        })
        setTimeout(() => {
          router.push('/academy/admin/lessons')
          router.refresh()
        }, 1000)
      } else if (lesson) {
        await updateLesson(lesson.id, lessonData)
        toast.success('Lesson updated successfully!', {
          description: 'Redirecting to lessons list...',
        })
        setTimeout(() => {
          router.push('/academy/admin/lessons')
          router.refresh()
        }, 1000)
      }
    } catch (error: any) {
      console.error('Error saving lesson:', error)

      // Handle specific error types
      if (error.message?.includes('Unauthorized')) {
        toast.error('Permission Denied', {
          description: 'You do not have permission to create/edit lessons. Contact an administrator.',
        })
      } else if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        toast.error('Lesson Already Exists', {
          description: 'A lesson with this slug already exists. Please use a different slug.',
        })
      } else {
        toast.error('Failed to Save Lesson', {
          description: error.message || 'An unexpected error occurred. Please try again.',
        })
      }

      setLoading(false)
    }
  }

  const contentTypeIcons = {
    text: FileText,
    video: Video,
    quiz: HelpCircle,
    puzzle: PuzzleIcon,
    mixed: Layers,
  }

  const ContentIcon = contentTypeIcons[contentType]

  return (
    <form onSubmit={(e) => handleSubmit(e, published)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Core details about the lesson</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Introduction to Chess Tactics (max 200 characters)"
              maxLength={200}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {title.length}/200 characters
            </p>
          </div>

          <div>
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="intro-to-chess-tactics (max 200 characters)"
              maxLength={200}
              pattern="[a-z0-9-]+"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              URL-friendly identifier (auto-generated from title) • {slug.length}/200 characters
            </p>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of what students will learn... (max 1000 characters)"
              maxLength={1000}
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              {description.length}/1000 characters
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="category">Category (Optional)</Label>
              <Select value={categoryId || undefined} onValueChange={setCategoryId}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categoryId && (
                <button
                  type="button"
                  onClick={() => setCategoryId('')}
                  className="text-xs text-gray-500 hover:text-gray-700 mt-1"
                >
                  Clear category
                </button>
              )}
            </div>

            <div>
              <Label htmlFor="difficulty">Difficulty (Optional)</Label>
              <Select value={difficulty || undefined} onValueChange={(v: any) => setDifficulty(v)}>
                <SelectTrigger id="difficulty">
                  <SelectValue placeholder="Not specified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
              {difficulty && (
                <button
                  type="button"
                  onClick={() => setDifficulty('')}
                  className="text-xs text-gray-500 hover:text-gray-700 mt-1"
                >
                  Clear difficulty
                </button>
              )}
            </div>

            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="30"
                min="1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Content Type</CardTitle>
          <CardDescription>Choose the type of content for this lesson</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(['text', 'video', 'quiz', 'puzzle', 'mixed'] as const).map((type) => {
              const Icon = contentTypeIcons[type]
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setContentType(type)}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    contentType === type
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon
                    className={`w-6 h-6 mx-auto mb-2 ${
                      contentType === type ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  />
                  <div className="text-sm font-medium capitalize">{type}</div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Content Editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ContentIcon className="w-5 h-5" />
            <CardTitle className="capitalize">{contentType} Content</CardTitle>
          </div>
          <CardDescription>Edit the lesson content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {contentType === 'text' && (
            <div>
              <Label htmlFor="textContent">Lesson Text (Markdown supported)</Label>
              <Textarea
                id="textContent"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="# Welcome to the lesson&#10;&#10;Write your lesson content here using Markdown..."
                rows={15}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                You can use Markdown formatting for headers, lists, bold, italic, etc.
              </p>
            </div>
          )}

          {contentType === 'video' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="videoUrl">Video URL</Label>
                <Input
                  id="videoUrl"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
              <div>
                <Label htmlFor="videoProvider">Provider</Label>
                <Select value={videoProvider} onValueChange={(v: any) => setVideoProvider(v)}>
                  <SelectTrigger id="videoProvider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="vimeo">Vimeo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {contentType === 'quiz' && (
            <QuizBuilder value={quizData} onChange={setQuizData} />
          )}

          {contentType === 'puzzle' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="puzzleFen">FEN Position</Label>
                <Input
                  id="puzzleFen"
                  value={puzzleFen}
                  onChange={(e) => setPuzzleFen(e.target.value)}
                  placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the starting position in FEN notation
                </p>
              </div>
              <div>
                <Label htmlFor="puzzleSolution">Solution Moves</Label>
                <Input
                  id="puzzleSolution"
                  value={puzzleSolution}
                  onChange={(e) => setPuzzleSolution(e.target.value)}
                  placeholder="e2e4, e7e5, Nf3"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Comma-separated list of moves in algebraic notation
                </p>
              </div>
            </div>
          )}

          {contentType === 'mixed' && (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <Layers className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                Mixed content builder coming soon
              </p>
              <p className="text-sm text-gray-500 mt-1">
                For now, create separate lessons for different content types
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>

        <div className="flex gap-2">
          {!published && (
            <Button
              type="button"
              variant="outline"
              onClick={(e) => handleSubmit(e, false)}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save as Draft
            </Button>
          )}

          <Button
            type="submit"
            onClick={(e) => handleSubmit(e, true)}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Eye className="w-4 h-4 mr-2" />
            )}
            {published ? 'Update & Publish' : 'Publish'}
          </Button>
        </div>
      </div>
    </form>
  )
}

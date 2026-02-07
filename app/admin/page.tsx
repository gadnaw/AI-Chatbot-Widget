import Link from 'next/link'
import { FileText, MessageSquare, Settings, Code } from 'lucide-react'

export default function AdminDashboard() {
  const stats = [
    { label: 'Documents', value: '0', icon: FileText },
    { label: 'Conversations', value: '0', icon: MessageSquare },
    { label: 'Widget Status', value: 'Active', icon: Settings },
  ]

  const quickActions = [
    {
      title: 'Manage Sources',
      description: 'Upload documents and manage training data',
      href: '/admin/sources',
      icon: FileText,
    },
    {
      title: 'View Conversations',
      description: 'Review chat history and analytics',
      href: '/admin/conversations',
      icon: MessageSquare,
    },
    {
      title: 'Customize Widget',
      description: 'Configure widget appearance and behavior',
      href: '/admin/settings',
      icon: Settings,
    },
    {
      title: 'Get Embed Code',
      description: 'Generate script tag for website',
      href: '/admin/embed',
      icon: Code,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to the Admin Panel
        </h1>
        <p className="text-gray-600">
          Manage your chatbot, upload documents, and customize the widget
          appearance.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-lg shadow p-6 flex items-center space-x-4"
          >
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Quick Actions
          </h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-start space-x-4 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <action.icon className="w-5 h-5 text-gray-600" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  {action.title}
                </h3>
                <p className="text-sm text-gray-500">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-indigo-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-indigo-900 mb-2">
          Getting Started
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-indigo-800">
          <li>
            Upload your first document in the{' '}
            <Link
              href="/admin/sources"
              className="font-medium hover:underline"
            >
              Sources
            </Link>{' '}
            section
          </li>
          <li>
            Configure widget settings in{' '}
            <Link
              href="/admin/settings"
              className="font-medium hover:underline"
            >
              Widget Settings
            </Link>
          </li>
          <li>
            Get your embed code in{' '}
            <Link href="/admin/embed" className="font-medium hover:underline">
              Embed Code
            </Link>
          </li>
        </ol>
      </div>
    </div>
  )
}
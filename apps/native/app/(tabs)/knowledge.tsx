import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { SearchModal } from "@/components/knowledge/search-modal"
import { ApiError } from "@/lib/api-client"
import { type BookmarkItem, deleteBookmark, fetchBookmarks } from "@/lib/bookmark-api"

const typeFilters = [
  { value: "all", label: "全部", icon: undefined },
  { value: "link", label: "链接", icon: "link-outline" as const },
  { value: "article", label: "文章", icon: "document-text-outline" as const },
  { value: "video", label: "视频", icon: "videocam-outline" as const },
  { value: "image", label: "图片", icon: "image-outline" as const },
]

const platformFilters = [
  { value: "all", label: "全部", icon: undefined },
  { value: "wechat", label: "微信", icon: "chatbubble-ellipses-outline" as const },
  { value: "xiaohongshu", label: "小红书", icon: "book-outline" as const },
  { value: "bilibili", label: "哔哩哔哩", icon: "play-circle-outline" as const },
]

export default function KnowledgeScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [activeType, setActiveType] = useState("all")
  const [activePlatform, setActivePlatform] = useState("all")
  const [error, setError] = useState<string>()
  const [searchVisible, setSearchVisible] = useState(false)

  const loadBookmarks = useCallback(
    async (offset = 0, append = false) => {
      try {
        const result = await fetchBookmarks({
          type: activeType === "all" ? undefined : activeType,
          platform: activePlatform === "all" ? undefined : activePlatform,
          limit: 20,
          offset,
        })
        setBookmarks((prev) => (append ? [...prev, ...result.bookmarks] : result.bookmarks))
        setHasMore(result.hasMore)
        setError(undefined)
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login")
          return
        }
        setError("加载失败，请稍后重试")
      }
    },
    [activeType, activePlatform, router]
  )

  useEffect(() => {
    setIsLoading(true)
    loadBookmarks().finally(() => setIsLoading(false))
  }, [loadBookmarks])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadBookmarks()
    setIsRefreshing(false)
  }

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) {
      return
    }
    setIsLoadingMore(true)
    await loadBookmarks(bookmarks.length, true)
    setIsLoadingMore(false)
  }

  const handleDelete = (id: string) => {
    Alert.alert("删除收藏", "确定要删除这条收藏吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteBookmark(id)
            setBookmarks((prev) => prev.filter((b) => b.id !== id))
          } catch {
            Alert.alert("删除失败", "请稍后重试")
          }
        },
      },
    ])
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>收藏</Text>
        <Pressable hitSlop={8} onPress={() => setSearchVisible(true)}>
          <Ionicons color="#262626" name="search-outline" size={24} />
        </Pressable>
      </View>

      <FilterChips
        activePlatform={activePlatform}
        activeType={activeType}
        onPlatformChange={setActivePlatform}
        onTypeChange={setActiveType}
      />

      <BookmarkContent
        bookmarks={bookmarks}
        error={error}
        handleDelete={handleDelete}
        handleLoadMore={handleLoadMore}
        handleRefresh={handleRefresh}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        isRefreshing={isRefreshing}
        loadBookmarks={loadBookmarks}
        router={router}
      />

      <SearchModal
        onClose={() => setSearchVisible(false)}
        onSelectResult={(id) => {
          setSearchVisible(false)
          router.push({ pathname: "/bookmark/[id]", params: { id } })
        }}
        visible={searchVisible}
      />
    </View>
  )
}

const typeIconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  link: "link-outline",
  article: "document-text-outline",
  video: "videocam-outline",
  image: "image-outline",
}

function BookmarkContent({
  isLoading,
  error,
  bookmarks,
  isLoadingMore,
  isRefreshing,
  loadBookmarks,
  handleRefresh,
  handleLoadMore,
  handleDelete,
  router,
}: {
  isLoading: boolean
  error: string | undefined
  bookmarks: BookmarkItem[]
  isLoadingMore: boolean
  isRefreshing: boolean
  loadBookmarks: (offset?: number, append?: boolean) => Promise<void>
  handleRefresh: () => Promise<void>
  handleLoadMore: () => Promise<void>
  handleDelete: (id: string) => void
  router: ReturnType<typeof useRouter>
}) {
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#737373" size="small" />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={() => loadBookmarks()} style={styles.retryButton}>
          <Text style={styles.retryText}>重试</Text>
        </Pressable>
      </View>
    )
  }

  if (bookmarks.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons color="#d4d4d4" name="bookmark-outline" size={48} />
        <Text style={styles.emptyTitle}>还没有任何收藏</Text>
        <Text style={styles.emptySubtitle}>开始收藏你喜欢的内容吧</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={bookmarks}
      keyExtractor={(item) => item.id}
      ListFooterComponent={
        isLoadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator color="#737373" size="small" />
          </View>
        ) : null
      }
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
      refreshControl={<RefreshControl onRefresh={handleRefresh} refreshing={isRefreshing} />}
      renderItem={({ item }) => (
        <BookmarkRow
          item={item}
          onDelete={() => handleDelete(item.id)}
          onPress={() => router.push({ pathname: "/bookmark/[id]", params: { id: item.id } })}
        />
      )}
    />
  )
}

function FilterChips({
  activeType,
  onTypeChange,
  activePlatform,
  onPlatformChange,
}: {
  activeType: string
  onTypeChange: (type: string) => void
  activePlatform: string
  onPlatformChange: (platform: string) => void
}) {
  return (
    <View style={styles.filterWrapper}>
      <ScrollView
        contentContainerStyle={styles.filterContainer}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {typeFilters.map((filter) => {
          const isActive = filter.value === activeType
          return (
            <Pressable
              key={filter.value}
              onPress={() => onTypeChange(filter.value)}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
            >
              {filter.icon && (
                <Ionicons color={isActive ? "#fff" : "#666"} name={filter.icon} size={14} />
              )}
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {filter.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
      <ScrollView
        contentContainerStyle={styles.filterContainer}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {platformFilters.map((filter) => {
          const isActive = filter.value === activePlatform
          return (
            <Pressable
              key={filter.value}
              onPress={() => onPlatformChange(filter.value)}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
            >
              {filter.icon && (
                <Ionicons color={isActive ? "#fff" : "#666"} name={filter.icon} size={14} />
              )}
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {filter.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

function getDomain(url: string | null): string | null {
  if (!url) {
    return null
  }
  try {
    return new URL(url).hostname.replace("www.", "")
  } catch {
    return null
  }
}

function BookmarkRow({
  item,
  onPress,
  onDelete,
}: {
  item: BookmarkItem
  onPress: () => void
  onDelete: () => void
}) {
  const icon = typeIconMap[item.type] || "link-outline"
  const domain = getDomain(item.url)
  const date = new Date(item.createdAt).toLocaleDateString("zh-CN")

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Ionicons color="#a3a3a3" name={icon} size={18} style={styles.rowIcon} />
      <View style={styles.rowContent}>
        <Text numberOfLines={1} style={styles.rowTitle}>
          {item.title}
        </Text>
        <View style={styles.rowMeta}>
          {(item.platform || domain) && (
            <Text style={styles.rowMetaText}>{item.platform || domain}</Text>
          )}
          <Text style={styles.rowMetaText}>{date}</Text>
        </View>
      </View>
      <Pressable hitSlop={8} onPress={onDelete} style={styles.deleteButton}>
        <Ionicons color="#d4d4d4" name="trash-outline" size={16} />
      </Pressable>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#262626",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#a3a3a3",
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
  },
  retryText: {
    fontSize: 14,
    color: "#525252",
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#a3a3a3",
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#d4d4d4",
  },
  filterWrapper: {
    gap: 4,
    paddingBottom: 4,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: "#f5f5f5",
  },
  filterChipActive: {
    backgroundColor: "#262626",
  },
  filterText: {
    fontSize: 13,
    color: "#525252",
  },
  filterTextActive: {
    color: "#fff",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0f0f0",
  },
  rowIcon: {
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
    marginRight: 8,
  },
  rowTitle: {
    fontSize: 15,
    color: "#262626",
  },
  rowMeta: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  rowMetaText: {
    fontSize: 12,
    color: "#a3a3a3",
  },
  deleteButton: {
    padding: 4,
  },
  footer: {
    paddingVertical: 16,
    alignItems: "center",
  },
})

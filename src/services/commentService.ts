
// Fix the error in the commentService.ts file
// The error occurs because we're trying to access properties directly on an array
// We need to access the first element of the array if it exists

// Check if author is an array and get the first element
if (Array.isArray(comment.author)) {
  comment.author = {
    username: comment.author[0]?.username || '',
    display_name: comment.author[0]?.display_name || '',
    avatar_url: comment.author[0]?.avatar_url || '',
    avatar_nft_id: comment.author[0]?.avatar_nft_id || null,
    avatar_nft_chain: comment.author[0]?.avatar_nft_chain || null
  };
}

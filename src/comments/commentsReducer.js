import * as commentsTypes from './commentsActions';
import * as userProfileTypes from '../user/userActions';
import * as appTypes from '../actions';

const initialState = {
  lists: {},
  comments: {},
  commentingDraft: {},
  isCommenting: false,
  currentDraftId: null,
};

const initialCommentingDraftItem = {
  parentAuthor: null,
  parentPermlink: null,
  category: null,
  body: '',
};

const defaultNumberOfCommentsToShow = 3;
const defaultCommentsForPagination = 10;

const commentsList = (state = {}, action) => {
  switch (action.type) {
    case commentsTypes.GET_COMMENTS_START:
      return {
        ...state,
        isFetching: true,
        list: [],
        show: defaultNumberOfCommentsToShow,
      };
    case commentsTypes.GET_COMMENTS_SUCCESS:
      const hasMore = action.payload.list.length > defaultNumberOfCommentsToShow;
      return {
        ...state,
        list: action.payload.list,
        isFetching: false,
        hasMore,
      };
    case commentsTypes.SHOW_MORE_COMMENTS:
      const newShowValue = state.show === defaultNumberOfCommentsToShow
        ? defaultCommentsForPagination
        : state.show + defaultCommentsForPagination;
      return {
        ...state,
        show: newShowValue,
        hasMore: newShowValue < state.list.length,
      };
    case commentsTypes.SEND_COMMENT_START:
      return {
        ...state,
        show: state.show + 1,
        list: [
          {
            id: action.meta.optimisticId,
            children: {},
          },
          ...state.list,
        ],
      };
    default:
      return state;
  }
};

const commentsLists = (state = {}, action) => {
  switch (action.type) {
    case commentsTypes.GET_COMMENTS_START:
    case commentsTypes.GET_COMMENTS_SUCCESS:
    case commentsTypes.SHOW_MORE_COMMENTS:
      return {
        ...state,
        [action.meta.id]: commentsList(state[action.meta.id], action),
      };
    case commentsTypes.SEND_COMMENT_START:
      return {
        ...state,
        [action.meta.parentId]: commentsList(state[action.meta.parentId], action),
      };
    default:
      return state;
  }
};

const mapCommentsBasedOnId = (data) => {
  const commentsList = {};
  Object.keys(data).forEach((key) => {
    commentsList[data[key].id] = data[key];
  });
  return commentsList;
};

const commentItem = (state = {}, action) => {
  switch (action.type) {
    case commentsTypes.LIKE_COMMENT_START:
      if (action.meta.isRetry) {
        // No optimistic change in case of retry
        return state;
      }

      let optimisticActiveVotes;

      if (action.meta.weight !== 0) {
        optimisticActiveVotes = [
          ...state.active_votes.filter(vote => vote.voter !== action.meta.voter),
          {
            voter: action.meta.voter,
            percent: action.meta.weight,
          }
        ];
      } else {
        optimisticActiveVotes = state.active_votes.filter(
          vote => vote.voter !== action.meta.voter
        );
      }

      const optimisticNetVotes = action.meta.weight > 0
        ? parseInt(state.net_votes) + 1
        : parseInt(state.net_votes) - 1;

      return {
        ...state,
        active_votes: optimisticActiveVotes,
        net_votes: optimisticNetVotes,
      };
    default:
      return state;
  }
}

const commentsData = (state = {}, action) => {
  switch (action.type) {
    case commentsTypes.GET_COMMENTS_SUCCESS:
    case userProfileTypes.GET_USER_COMMENTS_SUCCESS:
      return {
        ...state,
        ...mapCommentsBasedOnId(action.payload.content),
      };
    case userProfileTypes.GET_MORE_USER_COMMENTS_SUCCESS:
      const commentsMoreList = {};
      action.payload.result.forEach(comment => {
        commentsMoreList[comment.id] = comment;
      });
      return {
        ...state,
        ...commentsMoreList,
      };
    case commentsTypes.SEND_COMMENT_START:
      return {
        ...state,
        [action.meta.optimisticId]: action.payload,
      };
    case commentsTypes.LIKE_COMMENT_START:
      return {
        ...state,
        [action.meta.commentId]: commentItem(state[action.meta.commentId], action),
      };
    case commentsTypes.RELOAD_EXISTING_COMMENT:
      return {
        ...state,
        [action.payload.id]: action.payload,
      };
    default:
      return state;
  }
};

const commentingDraftItem = (state = initialCommentingDraftItem, action) => {
  switch (action.type) {
    case commentsTypes.OPEN_COMMENTING_DRAFT:
      const { parentAuthor, parentPermlink, category } = action.payload;
      return {
        ...state,
        parentAuthor,
        parentPermlink,
        category,
      };
    case commentsTypes.UPDATE_COMMENTING_DRAFT:
      return {
        ...state,
        body: action.payload.body,
      };
    default:
      return state;
  }
};

const commentingDraft = (state = {}, action) => {
  switch (action.type) {
    case commentsTypes.OPEN_COMMENTING_DRAFT:
    case commentsTypes.UPDATE_COMMENTING_DRAFT:
      const { id } = action.payload;
      return {
        ...state,
        [id]: commentingDraftItem(state[id], action),
      };
    default:
      return state;
  }
};

const comments = (state = initialState, action) => {
  switch (action.type) {
    case commentsTypes.GET_COMMENTS_START:
    case commentsTypes.GET_COMMENTS_SUCCESS:
    case userProfileTypes.GET_USER_COMMENTS_SUCCESS:
    case userProfileTypes.GET_MORE_USER_COMMENTS_SUCCESS:
    case commentsTypes.SHOW_MORE_COMMENTS:
    case commentsTypes.SEND_COMMENT_START:
      return {
        ...state,
        comments: commentsData(state.comments, action),
        lists: commentsLists(state.lists, action),
      };
    case commentsTypes.OPEN_COMMENTING_DRAFT:
      return {
        ...state,
        commentingDraft: commentingDraft(state.commentingDraft, action),
        isCommenting: true,
        currentDraftId: action.payload.id,
      };
    case commentsTypes.UPDATE_COMMENTING_DRAFT:
      return {
        ...state,
        commentingDraft: commentingDraft(state.commentingDraft, action),
      };
    case commentsTypes.CLOSE_COMMENTING_DRAFT:
    case appTypes.SHOW_SIDEBAR:
      return {
        ...state,
        isCommenting: false,
      };
    case commentsTypes.LIKE_COMMENT_START:
    case commentsTypes.RELOAD_EXISTING_COMMENT:
      return {
        ...state,
        comments: commentsData(state.comments, action),
      };
    default:
      return state;
  }
};

export default comments;

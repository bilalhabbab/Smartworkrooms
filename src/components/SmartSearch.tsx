import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  IconButton,
  Collapse,
  Divider,
  Button
} from '@mui/material';
import {
  Search,
  Description,
  ExpandMore,
  ExpandLess,
  Lightbulb,
  TrendingUp
} from '@mui/icons-material';
import { aiService, SemanticSearchResult } from '../services/aiService';
import { useChatRoom } from '../contexts/ChatRoomContext';
import { useAuth } from '../contexts/AuthContext';
import { analyticsService } from '../services/analyticsService';

interface SmartSearchProps {
  onDocumentSelect: (documentId: string, chunk?: string) => void;
}

const SmartSearch: React.FC<SmartSearchProps> = ({ onDocumentSelect }) => {
  const { currentUser } = useAuth();
  const { currentRoom, getRoomFiles, currentOrganization } = useChatRoom();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  const documents = currentRoom ? getRoomFiles(currentRoom.id) : [];

  useEffect(() => {
    if (query.length > 2) {
      const timeoutId = setTimeout(() => {
        performSearch();
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setResults([]);
    }
  }, [query]);

  useEffect(() => {
    loadSuggestions();
  }, [documents]);

  const loadSuggestions = async () => {
    if (documents.length === 0) return;

    try {
      // Generate contextual suggestions based on recent documents
      const recentDocs = documents.slice(0, 3);
      const contextualSuggestions = await aiService.getContextualSuggestions(
        'What can I learn from these documents?',
        recentDocs
      );
      setSuggestions(contextualSuggestions.slice(0, 5));
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const performSearch = async () => {
    if (!query.trim() || documents.length === 0) return;

    setLoading(true);
    try {
      const searchResults = await aiService.semanticSearch(query, documents);
      setResults(searchResults);

      // Track search analytics
      if (currentUser && currentOrganization) {
        analyticsService.trackEvent(
          currentUser.email,
          currentUser.displayName || currentUser.email,
          currentOrganization.id,
          'search_performed',
          { query, resultCount: searchResults.length },
          currentRoom?.id
        );
      }
    } catch (error) {
      console.error('Error performing search:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
  };

  const toggleResultExpansion = (documentId: string) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(documentId)) {
      newExpanded.delete(documentId);
    } else {
      newExpanded.add(documentId);
    }
    setExpandedResults(newExpanded);
  };

  const handleDocumentClick = (result: SemanticSearchResult, chunk?: string) => {
    onDocumentSelect(result.documentId, chunk);
  };

  const getRelevanceColor = (score: number) => {
    if (score > 0.8) return 'success';
    if (score > 0.6) return 'warning';
    return 'default';
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 600 }}>
      {/* Search Input */}
      <TextField
        fullWidth
        placeholder="Search across all documents..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        InputProps={{
          startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          endAdornment: loading && <CircularProgress size={20} />
        }}
        sx={{ mb: 2 }}
      />

      {/* Smart Suggestions */}
      {suggestions.length > 0 && query.length === 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Lightbulb sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="subtitle2">Smart Suggestions</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {suggestions.map((suggestion, index) => (
              <Chip
                key={index}
                label={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                size="small"
                variant="outlined"
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Paper>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <Paper sx={{ maxHeight: 500, overflow: 'auto' }}>
          <List>
            {results.map((result, index) => (
              <React.Fragment key={result.documentId}>
                <ListItem
                  onClick={() => toggleResultExpansion(result.documentId)}
                  sx={{ 
                    flexDirection: 'column', 
                    alignItems: 'stretch',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <ListItemIcon>
                      <Description />
                    </ListItemIcon>
                    <ListItemText
                      primary={result.documentName}
                      secondary={`${result.relevantChunks.length} relevant sections found`}
                    />
                    <Chip
                      label={`${Math.round(result.overallScore * 100)}% match`}
                      size="small"
                      color={getRelevanceColor(result.overallScore)}
                    />
                    <IconButton size="small">
                      {expandedResults.has(result.documentId) ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Box>

                  <Collapse in={expandedResults.has(result.documentId)}>
                    <Box sx={{ mt: 2, pl: 2 }}>
                      {result.relevantChunks.map((chunk, chunkIndex) => (
                        <Box
                          key={chunkIndex}
                          sx={{
                            mb: 2,
                            p: 2,
                            bgcolor: 'background.default',
                            borderRadius: 1,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDocumentClick(result, chunk.text);
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Section {chunkIndex + 1}
                            </Typography>
                            <Chip
                              label={`${Math.round(chunk.score * 100)}%`}
                              size="small"
                              color={getRelevanceColor(chunk.score)}
                            />
                          </Box>
                          <Typography variant="body2" sx={{ 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {chunk.text}
                          </Typography>
                          <Button
                            size="small"
                            sx={{ mt: 1 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDocumentClick(result, chunk.text);
                            }}
                          >
                            View in Context
                          </Button>
                        </Box>
                      ))}
                    </Box>
                  </Collapse>
                </ListItem>
                {index < results.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* No Results */}
      {query.length > 2 && !loading && results.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No relevant documents found for "{query}"
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Try different keywords or upload more documents
          </Typography>
        </Paper>
      )}

      {/* Empty State */}
      {documents.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Description sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Documents Available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload some documents to start searching
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default SmartSearch;

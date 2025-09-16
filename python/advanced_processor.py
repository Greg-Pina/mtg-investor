#!/usr/bin/env python3
"""
MTG Card Data Processor using pyedhrec

This script uses the pyedhrec library to gather comprehensive Magic: The Gathering
card information from EDHREC.com. It processes card requests and returns detailed
card data that can be stored in the MongoDB database.

Requirements:
- pip install pyedhrec
"""

import sys
import json
from datetime import datetime
from typing import Dict, List, Any, Optional

try:
    from pyedhrec import EDHRec
    PYEDHREC_AVAILABLE = True
except ImportError:
    PYEDHREC_AVAILABLE = False

class MTGCardProcessor:
    def __init__(self):
        if PYEDHREC_AVAILABLE:
            self.edhrec = EDHRec()
        else:
            self.edhrec = None

    def get_card_information(self, card_name: str) -> Dict[str, Any]:
        """
        Get comprehensive information about a specific MTG card.
        
        Args:
            card_name: The exact name of the MTG card
            
        Returns:
            Dictionary containing all available card information
        """
        if not self.edhrec:
            return {
                'error': 'pyedhrec module not available',
                'install_command': 'pip install pyedhrec'
            }

        try:
            result = {
                'card_name': card_name,
                'retrieved_at': datetime.now().isoformat(),
                'data_source': 'edhrec.com'
            }

            # Get basic card details
            try:
                details = self.edhrec.get_card_details(card_name)
                result['details'] = details
            except Exception as e:
                result['details_error'] = str(e)

            # Get EDHREC link
            try:
                link = self.edhrec.get_card_link(card_name)
                result['edhrec_link'] = link
            except Exception as e:
                result['link_error'] = str(e)

            # Get combos for the card
            try:
                combos = self.edhrec.get_card_combos(card_name)
                result['combos'] = combos
            except Exception as e:
                result['combos_error'] = str(e)

            # If it's a potential commander, get commander-specific data
            try:
                commander_data = self.edhrec.get_commander_data(card_name)
                result['commander_data'] = commander_data
                
                # Get cards commonly associated with this commander
                commander_cards = self.edhrec.get_commander_cards(card_name)
                result['commander_cards'] = commander_cards
                
                # Get average decklist
                avg_deck = self.edhrec.get_commanders_average_deck(card_name)
                result['average_deck'] = avg_deck
                
                # Get known deck lists
                decks = self.edhrec.get_commander_decks(card_name)
                result['known_decks'] = decks
                
                # Get recommendation data
                result['recommendations'] = {
                    'new_cards': self.edhrec.get_new_cards(card_name),
                    'high_synergy_cards': self.edhrec.get_high_synergy_cards(card_name),
                    'top_cards': self.edhrec.get_top_cards(card_name),
                    'top_creatures': self.edhrec.get_top_creatures(card_name),
                    'top_instants': self.edhrec.get_top_instants(card_name),
                    'top_sorceries': self.edhrec.get_top_sorceries(card_name),
                    'top_enchantments': self.edhrec.get_top_enchantments(card_name),
                    'top_artifacts': self.edhrec.get_top_artifacts(card_name),
                    'top_mana_artifacts': self.edhrec.get_top_mana_artifacts(card_name),
                    'top_battles': self.edhrec.get_top_battles(card_name),
                    'top_planeswalkers': self.edhrec.get_top_planeswalkers(card_name),
                    'top_utility_lands': self.edhrec.get_top_utility_lands(card_name),
                    'top_lands': self.edhrec.get_top_lands(card_name)
                }
                
            except Exception as e:
                result['commander_data_error'] = str(e)

            return result

        except Exception as e:
            return {
                'card_name': card_name,
                'error': 'Failed to retrieve card information',
                'details': str(e),
                'retrieved_at': datetime.now().isoformat()
            }

    def get_multiple_cards_information(self, card_names: List[str]) -> Dict[str, Any]:
        """
        Get information for multiple cards.
        
        Args:
            card_names: List of card names to process
            
        Returns:
            Dictionary containing information for all requested cards
        """
        if not self.edhrec:
            return {
                'error': 'pyedhrec module not available',
                'install_command': 'pip install pyedhrec'
            }

        results = {
            'processed_at': datetime.now().isoformat(),
            'total_cards': len(card_names),
            'cards': {},
            'batch_operations': {}
        }

        # Process individual cards
        for card_name in card_names:
            results['cards'][card_name] = self.get_card_information(card_name)

        # Try batch operations if available
        try:
            batch_details = self.edhrec.get_card_list(card_names)
            results['batch_operations']['card_list'] = batch_details
        except Exception as e:
            results['batch_operations']['card_list_error'] = str(e)

        return results

    def analyze_card_data(self, card_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze card data to extract investment insights.
        
        Args:
            card_data: Raw card data from EDHREC
            
        Returns:
            Analysis and insights about the card
        """
        analysis = {
            'analysis_timestamp': datetime.now().isoformat(),
            'card_name': card_data.get('card_name', 'Unknown'),
            'investment_metrics': {},
            'popularity_metrics': {},
            'synergy_analysis': {}
        }

        # Analyze commander data if available
        if 'commander_data' in card_data and card_data['commander_data']:
            commander_info = card_data['commander_data']
            analysis['investment_metrics']['is_commander'] = True
            
            # Extract popularity metrics
            if isinstance(commander_info, dict):
                analysis['popularity_metrics']['commander_rank'] = commander_info.get('rank')
                analysis['popularity_metrics']['total_decks'] = commander_info.get('num_decks')

        # Analyze recommendations if available
        if 'recommendations' in card_data:
            recs = card_data['recommendations']
            analysis['synergy_analysis']['has_recommendations'] = True
            
            # Count total recommended cards
            total_recommendations = 0
            for category, cards in recs.items():
                if isinstance(cards, list):
                    total_recommendations += len(cards)
            
            analysis['synergy_analysis']['total_recommendations'] = total_recommendations

        # Analyze combo potential
        if 'combos' in card_data and card_data['combos']:
            analysis['synergy_analysis']['combo_count'] = len(card_data['combos'])
            analysis['investment_metrics']['has_combos'] = True
        else:
            analysis['synergy_analysis']['combo_count'] = 0
            analysis['investment_metrics']['has_combos'] = False

        return analysis

def process_mtg_request(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process MTG card requests based on input data.
    
    Args:
        data: Input data containing card names and processing options
        
    Returns:
        Processed MTG card information
    """
    processor = MTGCardProcessor()
    
    # Extract card information from input
    card_names = []
    
    if 'card_name' in data:
        card_names = [data['card_name']]
    elif 'card_names' in data:
        card_names = data['card_names']
    elif 'cards' in data:
        card_names = data['cards']
    else:
        # Try to find card names in the data structure
        for key, value in data.items():
            if 'card' in key.lower() and isinstance(value, str):
                card_names.append(value)
            elif 'card' in key.lower() and isinstance(value, list):
                card_names.extend(value)

    if not card_names:
        return {
            'error': 'No card names found in input data',
            'expected_format': {
                'card_name': 'Single card name',
                'card_names': ['List', 'of', 'card', 'names'],
                'cards': ['Alternative', 'list', 'format']
            },
            'processed_at': datetime.now().isoformat()
        }

    # Process the cards
    if len(card_names) == 1:
        result = processor.get_card_information(card_names[0])
        # Add analysis
        result['analysis'] = processor.analyze_card_data(result)
    else:
        result = processor.get_multiple_cards_information(card_names)
        # Add analysis for each card
        for card_name, card_data in result.get('cards', {}).items():
            if isinstance(card_data, dict) and 'error' not in card_data:
                card_data['analysis'] = processor.analyze_card_data(card_data)

    # Add processing metadata
    result['processing_info'] = {
        'processor_version': '1.0.0',
        'pyedhrec_available': PYEDHREC_AVAILABLE,
        'cards_processed': len(card_names),
        'processing_mode': 'single' if len(card_names) == 1 else 'batch'
    }

    return result

def main():
    try:
        if len(sys.argv) < 2:
            raise ValueError("No input data provided")
        
        json_input = sys.argv[1]
        data = json.loads(json_input)
        
        # Process MTG card data
        result = process_mtg_request(data)
        
        # Return result as JSON
        print(json.dumps(result, indent=2, default=str))
        
    except json.JSONDecodeError as e:
        error_result = {
            'error': 'Invalid JSON input',
            'details': str(e),
            'timestamp': datetime.now().isoformat()
        }
        print(json.dumps(error_result))
        sys.exit(1)
        
    except Exception as e:
        error_result = {
            'error': 'MTG card processing failed',
            'details': str(e),
            'timestamp': datetime.now().isoformat(),
            'pyedhrec_available': PYEDHREC_AVAILABLE
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == '__main__':
    main()
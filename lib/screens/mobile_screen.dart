import 'package:firebase_analytics_web/firebase_analytics_web.dart';
import 'package:flutter/material.dart';
import 'package:hearth_arena_rank_web/models/rankdata.dart';
import '../constants/area.dart';
import '../widgets/rank_card.dart';

import '../widgets/footer.dart';
import '../services/search.dart';

class MobileScreen extends StatefulWidget {
  final bool isDarkMode;
  final Function(bool) toggleTheme;
  final FirebaseAnalyticsWeb analytics;

  const MobileScreen(
      {super.key,
      required this.isDarkMode,
      required this.toggleTheme,
      required this.analytics});

  @override
  _MobileScreenState createState() => _MobileScreenState();
}

class _MobileScreenState extends State<MobileScreen> {
  AreaLabel area = AreaLabel.ap;
  TextEditingController battleTagController = TextEditingController();
  SearchService service = SearchService();
  bool isSearching = false;
  bool isResult = false;
  Map<String, dynamic> searchResult = {'status': false};

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Hearth.gg'),
        actions: [
          Switch(
            value: widget.isDarkMode,
            onChanged: widget.toggleTheme,
            activeColor: Colors.blue,
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Row(
                      children: [
                        Expanded(
                          child: DropdownButtonHideUnderline(
                            child: DropdownButtonFormField<AreaLabel>(
                              value: area,
                              items: AreaLabel.values
                                  .map<DropdownMenuItem<AreaLabel>>(
                                      (AreaLabel value) {
                                return DropdownMenuItem<AreaLabel>(
                                  value: value,
                                  child: Text(
                                    value.text,
                                    style: TextStyle(fontSize: 12),
                                  ),
                                );
                              }).toList(),
                              onChanged: (AreaLabel? newValue) {
                                setState(() {
                                  area = newValue!;
                                });
                              },
                              itemHeight: 50,
                              isExpanded: true,
                              decoration: InputDecoration(
                                enabledBorder: OutlineInputBorder(
                                  borderSide:
                                      BorderSide(color: Colors.grey, width: 1),
                                ),
                                border: OutlineInputBorder(),
                                filled: false,
                              ),
                            ),
                          ),
                        ),
                        SizedBox(width: 1),
                        Expanded(
                          flex: 3,
                          child: TextFormField(
                            controller: battleTagController,
                            onFieldSubmitted: (_) async {
                              await widget.analytics.logEvent(
                                  name:
                                      '[+] Search Event with EnterKey ${battleTagController.text}');
                              setState(() {
                                isSearching = true;
                                searchResult = {'status': false};
                                isResult = false;
                              });
                              await service
                                  .performSearch(
                                      areaCode: area.code,
                                      id: battleTagController.text)
                                  .then((result) {
                                setState(() {
                                  isSearching = false;
                                  if (result['status']) {
                                    isResult = true;
                                    searchResult = result;
                                  }
                                });
                              });
                            },
                            decoration: InputDecoration(
                              hintText: '배틀태그를 입력하세요. (ex: Flurry)',
                              hintStyle: TextStyle(
                                  fontSize: 12, fontWeight: FontWeight.bold),
                              border: OutlineInputBorder(),
                              suffixIcon: IconButton(
                                icon: Icon(Icons.search),
                                onPressed: () async {
                                  await widget.analytics.logEvent(
                                      name:
                                          '[+] Search Event with Button ${battleTagController.text}');
                                  setState(() {
                                    isSearching = true;
                                    searchResult = {'status': false};
                                    isResult = false;
                                  });
                                  await service
                                      .performSearch(
                                          areaCode: area.code,
                                          id: battleTagController.text)
                                      .then((result) {
                                    setState(() {
                                      isSearching = false;
                                      if (result['status']) {
                                        isResult = true;
                                        searchResult = result;
                                      }
                                    });
                                  });
                                },
                              ),
                              contentPadding:
                                  EdgeInsets.fromLTRB(15, 22, 10, 22),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  isSearching
                      ? Container(
                          padding: EdgeInsets.all(15),
                          height: 150,
                          width: 150,
                          child: CircularProgressIndicator(
                            strokeWidth: 15,
                          ),
                        )
                      : isResult
                          ? SizedBox(
                              width: MediaQuery.of(context).size.width * 0.8,
                              child: RankCard(
                                  rankData: RankData.fromJson(searchResult)),
                            )
                          : Container(),
                ],
              ),
            ),
          ),
          Footer(),
        ],
      ),
    );
  }
}

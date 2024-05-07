import 'package:flutter/material.dart';

import '../services/search.dart';
import '../widgets/card.dart';
import '../widgets/footer.dart';
import '../constants/area.dart';

class DesktopScreen extends StatefulWidget {
  final bool isDarkMode;
  final Function(bool) toggleTheme;

  const DesktopScreen(
      {super.key, required this.isDarkMode, required this.toggleTheme});

  @override
  _DesktopScreenState createState() => _DesktopScreenState();
}

class _DesktopScreenState extends State<DesktopScreen> {
  String area = '아시아태평양';
  TextEditingController battleTagController = TextEditingController();
  SearchService service = SearchService();
  bool isSearching = false;
  bool isResult = false;
  Map<String, dynamic> searchResult = {'status': false};

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: InkWell(
          child: const Text('투기장 등수 검색 HearthGG.web.app'),
          onTap: () {},
        ),
        centerTitle: false,
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
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Image.asset('images/main.png', width: 240),
          ),
          SizedBox(
            width: MediaQuery.of(context).size.width * 0.4,
            child: Row(
              children: <Widget>[
                Expanded(
                  child: DropdownButtonHideUnderline(
                    child: DropdownButtonFormField<String>(
                      value: area,
                      items: areas.keys
                          .map<DropdownMenuItem<String>>((String value) {
                        return DropdownMenuItem<String>(
                          value: value,
                          child: Text(value),
                        );
                      }).toList(),
                      onChanged: (String? newValue) {
                        setState(() {
                          area = newValue!;
                        });
                      },
                      isExpanded: true,
                      decoration: InputDecoration(
                        enabledBorder: OutlineInputBorder(
                          borderSide: BorderSide(color: Colors.grey, width: 1),
                        ),
                        border: OutlineInputBorder(),
                        filled: false,
                      ),
                    ),
                  ),
                ),
                SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: TextFormField(
                    controller: battleTagController,
                    onFieldSubmitted: (_) async {
                      setState(() {
                        isSearching = true;
                        searchResult = {'status': false};
                        isResult = false;
                      });
                      await service
                          .performSearch(
                              areaCode: areas[area]!,
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
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.search),
                  onPressed: () async {
                    setState(() {
                      isSearching = true;
                      searchResult = {'status': false};
                      isResult = false;
                    });
                    await service
                        .performSearch(
                            areaCode: areas[area]!,
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
                      width: MediaQuery.of(context).size.width * 0.4,
                      child: RankCard(rankData: searchResult))
                  : Container(),
          Expanded(
              child: Container()), // Use expanded to push footer to the bottom
          Footer(),
        ],
      ),
    );
  }
}
